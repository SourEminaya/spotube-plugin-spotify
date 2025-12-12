import {
	type Cookie,
	IAuthEndpoint,
	localStorage,
	WebView,
} from "@spotube-app/plugin";
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

class SpotifyAuthEndpoint extends IAuthEndpoint {
	credentials?: Credentials | null = null;
	onEvent:
		| ((
				auth: InstanceType<typeof SpotifyAuthEndpoint>,
				data: "login" | "logout" | "refreshed" | "recovered",
		  ) => void)
		| null = null;
	timer?: number = undefined;

	constructor(
		onEvent?: (
			auth: InstanceType<typeof SpotifyAuthEndpoint>,
			data: string,
		) => void,
	) {
		super();
		if (onEvent) {
			this.onEvent = onEvent;
		}
		this.initializeFromLocalStorage();
	}

	fireEvent(event: "login" | "logout" | "refreshed" | "recovered") {
		if (this.onEvent) {
			this.onEvent(this, event);
		}
		if (this.onAuthEvent) {
			this.onAuthEvent(
				event === "recovered" || event === "refreshed"
					? "refreshSession"
					: event,
			);
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

	async initializeFromLocalStorage() {
		try {
			const credentialsStr = localStorage.getItem("credentials");
			if (credentialsStr != null) {
				this.credentials = JSON.parse(credentialsStr);
				if (this.isExpired()) {
					await this.refreshCredentials();
				} else {
					this.fireEvent("recovered");
				}
			}
		} catch (error) {
			console.error("[initializeFromLocalStorage]:", error);
		}
	}

	async getLatestNuance(): Promise<NuancePayload> {
		const res = await fetch(
			"https://codeberg.org/sonic-liberation/blubber-junkyard-elitism/raw/branch/main/nuances.json",
		);
		const data: NuancePayload[] = await res.json();
		data.sort((a, b) => b.v - a.v);
		return data[0] as NuancePayload;
	}

	async generateTimedOnTimePassword(secret: string): Promise<string> {
		const res = await fetch("https://open.spotify.com/api/server-time");
		const data: { serverTime: number } = await res.json();

		const timestampSeconds = data.serverTime;
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

		const res = await fetch(accessTokenUrl, {
			headers: {
				Cookie: spDc ?? "",
				"User-Agent": userAgent,
			},
		});
		const data: AuthTokenResponse = await res.json();

		return { body: data, headers: res.headers };
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

	async refreshCredentials() {
		if (!this.credentials?.cookies) {
			console.info(
				"[refreshCredentials] No cookie found. Cannot refresh credentials.",
			);
			return;
		}
		const creds = await this.credentialsFromCookie(this.credentials.cookies);
		localStorage.setItem("credentials", JSON.stringify(creds));
		this.credentials = creds;
		this.fireEvent("refreshed");
	}

	async authenticate(): Promise<void> {
		const webview = await WebView.create("https://accounts.spotify.com/");

		webview.onUrlChange(async (url) => {
			const safeUrl = url.endsWith("/")
				? url.substring(0, url.length - 1)
				: url;
			const exp = /https:\/\/accounts.spotify.com\/.*\/?status/gi;

			if (exp.test(safeUrl)) {
				const cookies = await webview.cookies(url);
				await this.login(cookies);
				await webview.close();
			}
		});

		await webview.open();
	}

	async logout() {
		this.credentials = null;
		localStorage.removeItem("credentials");
		this.fireEvent("logout");
	}
}

export { SpotifyAuthEndpoint };
