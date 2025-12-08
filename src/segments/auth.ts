import { type Cookie, localStorage, Webview } from "@spotube-app/plugin";
import type { KyInstance } from "ky";
import ky from "ky";
import { differenceInMilliseconds, isAfter } from "date-fns";
import { TOTP } from "totp-generator";

interface NuancePayload {
	v: number;
	s: string;
}

interface AuthTokenResponse {
	clientId: string;
	accessToken: string;
	accessTokenExpirationTimestampMs: number;
	isAnonymous: boolean;
	_notes?: string | null | undefined;
}

interface Credentials {
	cookies: Cookie[];
	accessToken: string;
	expiration: number;
}

class SpotifyAuthEndpoint {
	credentials?: Credentials | null = null;
	client: KyInstance;
	onEvent: ((data: string) => void) | null = null;
	timer?: number = undefined;

	constructor(onEvent: (data: string) => void) {
		this.client = ky.extend({});
		this.onEvent = onEvent;

		this.initializeFromLocalStorage();
	}

	fireEvent(event: string) {
		if (this.onEvent) {
			this.onEvent(event);
		}

		if (event === "recovered" || event === "login") {
			clearTimeout(this.timer);
			this.timer = setInterval(() => {
				this.refreshCredentials();
			}, this.getExpirationDuration());
		}
	}

	isExpired(): boolean {
		if (!this.credentials) {
			return true;
		}

		const currentTime = new Date();

		const expirationTime = new Date(this.credentials.expiration as number);

		return isAfter(currentTime, expirationTime);
	}

	getExpirationDuration(): number {
		if (!this.credentials) {
			return 0;
		}

		const currentTime = new Date();

		const expirationTime = new Date(this.credentials.expiration as number);

		return differenceInMilliseconds(expirationTime, currentTime) - 60000; // Refresh 1 minute before expiration
	}

	initializeFromLocalStorage() {
		const credentialsStr = localStorage.getItem("credentials");
		if (credentialsStr != null) {
			this.credentials = JSON.parse(credentialsStr);
			if (this.isExpired()) {
				this.refreshCredentials();
			} else {
				this.fireEvent("recovered");
			}
		}
	}

	async getLatestNuance(): Promise<NuancePayload> {
		// Future<{v: int, s: string}>
		const data = await this.client
			.get(
				"https://codeberg.org/sonic-liberation/blubber-junkyard-elitism/raw/branch/main/nuances.json",
			)
			.json<NuancePayload[]>();
		data.sort((a, b) => b.v - a.v);
		return data[0] as NuancePayload;
	}

	async generateTimedOnTimePassword(secret: string): Promise<string> {
		const res = await this.client
			.get("https://open.spotify.com/api/server-time")
			.json<{ serverTime: number }>();

		const timestampSeconds = res.serverTime;
		const totp = await TOTP.generate(secret, {
			algorithm: "SHA-1",
			digits: 6,
			timestamp: timestampSeconds * 1000,
			period: 30,
		});
		return totp.otp;
	}

	randomBytesFromMath(length: number): string {
		const bytes: number[] = [];

		for (let i = 0; i < length; i++) {
			bytes.push(Math.floor(Math.random() * 256));
		}

		return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
	}

	async getToken({
		mode = "transport",
		spDc,
		timestamp,
		totp,
		totpVer,
	}: {
		mode: "transport" | "login";
		timestamp: number;
		totp: string;
		spDc: string;
		totpVer: number;
	}): Promise<{ body: AuthTokenResponse; headers: Headers }> {
		console.log(
			`Timestamp: ${timestamp}, TOTP: ${totp}, Mode: ${mode}, spDc: ${spDc}`,
		);
		// const timestampSeconds = Math.floor(timestamp / 1000)
		const accessTokenUrl = `https://open.spotify.com/api/token?reason=${mode}&productType=web-player&totp=${totp}&totpServer=${totp}&totpVer=${totpVer}`;

		const userAgent = `${Date.now()}${
			Math.floor(Math.random() * 100) * 1000
		}${this.randomBytesFromMath(16)}`
			.split("")
			.join("");

		const res = await this.client.get(accessTokenUrl, {
			headers: {
				Cookie: spDc ?? "",
				"User-Agent": userAgent,
			},
		});

		return { body: await res.json<AuthTokenResponse>(), headers: res.headers };
	}

	async credentialsFromCookie(cookies: Cookie[]): Promise<Credentials> {
		const spDc = cookies.filter((c) => c.name === "sp_dc")[0]?.value;
		const nuance = await this.getLatestNuance();
		const totp = await this.generateTimedOnTimePassword(nuance.s);
		const res = await this.getToken({
			totp: totp,
			timestamp: Date.now(),
			spDc: `sp_dc=${spDc};`,
			mode: "transport",
			totpVer: nuance.v,
		});
		if (!res.body.accessToken) {
			console.warn(
				`The access token is only ${res.body.accessToken.length} characters long instead of 374. Your authentication probably doesn't work`,
			);
		}
		return {
			cookies: cookies,
			accessToken: res.body.accessToken,
			expiration: res.body.accessTokenExpirationTimestampMs,
		};
	}

	isAuthenticated(): boolean {
		return !!this.credentials && !this.isExpired();
	}

	async login(cookies: Cookie[]): Promise<void> {
		const creds = await this.credentialsFromCookie(cookies);
		localStorage.setItem("credentials", JSON.stringify(creds));
		this.credentials = creds;
		this.fireEvent("login");
	}

	refreshCredentials() {
		if (!this.credentials?.cookies) {
			console.log(
				"[refreshCredentials] No cookie found. Cannot refresh credentials.",
			);
			return;
		}
		return this.credentialsFromCookie(this.credentials.cookies).then(
			(creds) => {
				localStorage.setItem("credentials", JSON.stringify(creds));
				this.credentials = creds;
				this.fireEvent("refreshed");
			},
		);
	}

	async authenticate(): Promise<void> {
		const webview = await Webview.create("https://accounts.spotify.com/");

		webview.onUrlRequestStream(async (url) => {
			const safeUrl = url.endsWith("/")
				? url.substring(0, url.length - 1)
				: url;
			const exp = /https:\/\/accounts.spotify.com\/.+\/status/gi;

			if (exp.test(safeUrl)) {
				const cookies = await webview.getCookies(url);
				await this.login(cookies.map((cookie) => cookie));
				await webview.close();
			}
		});

		await webview.open();
	}

	logout() {
		this.credentials = null;
		localStorage.removeItem("credentials");
		this.fireEvent("logout");
	}
}

export { SpotifyAuthEndpoint };
