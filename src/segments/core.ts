import type {
	PluginConfiguration,
	PluginUpdateAvailable,
	ScrobbleDetails,
} from "@spotube-app/plugin";
import type { ICoreEndpoint } from "@spotube-app/plugin";
import semver from "semver";

const supportStr = `Just use this plugin and I am good. No need for supporting me.

**But support the artists.** 

Stop feeding megacorp with money. Directly donate to artists or buy their merch or go to their concerts.
The 30% streaming service cut and other e.g. record labels cut is ridiculous.
Artists (only ones directly involved in making the music) deserve 100% of the money you pay for their music.
Not some greedy corporations and stupid middlemen.
`;

class CorePlugin implements ICoreEndpoint {
	async scrobble(_details: ScrobbleDetails): Promise<void> {
		return;
	}

	async checkUpdate(
		currentConfig: PluginConfiguration,
	): Promise<PluginUpdateAvailable | null> {
		const parsed = semver.parse(currentConfig.version);

		if (!parsed) {
			return Promise.reject(
				"Invalid version format in current plugin configuration.",
			);
		}

		const res = await fetch(
			"https://api.github.com/repos/sonic-liberation/spotube-plugin-spotify/releases/latest",
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
				},
			},
		);
		const data: {
			tag_name: string;
			body: string | undefined;
			assets: { name: string; browser_download_url: string }[];
		} = await res.json();

		const latestVersion = semver.parse(data.tag_name);
		if (!latestVersion) {
			throw new Error(
				`Invalid version format from GitHub API. Expected format: <major>.<minor>.<patch>. Got: ${data.tag_name}`,
			);
		}

		const isUpdateAvailable = semver.gt(latestVersion, parsed);
		if (!isUpdateAvailable) return null;

		const pluginFileAsset = data.assets.find(
			(asset) => asset.name === "plugin.smplug",
		);
		if (
			pluginFileAsset == null ||
			pluginFileAsset.browser_download_url == null
		) {
			throw "No download URL found for the plugin update";
		}
		const changelog = data.body ?? "No changelog available";
		return {
			downloadUrl: pluginFileAsset.browser_download_url,
			version: data.tag_name,
			changelog: changelog,
		};
	}

	/// Returns the support information for the plugin in Markdown or plain text.
	/// Supports images and links.
	support(): string {
		return supportStr;
	}
}

export { CorePlugin };
