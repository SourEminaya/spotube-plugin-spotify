import type { SpotifyGqlApi } from "spotify-gql-client";
import { Converters } from "../converter/converter.js";
import type { SpotifyAuthEndpoint } from "./auth.js";
import {
	Timezone,
	type IBrowseEndpoint,
	type SpotubeBrowseSectionObject,
	type SpotubePaginationResponseObject,
} from "@spotube-app/plugin";

export class BrowseEndpoint implements IBrowseEndpoint {
	client: SpotifyGqlApi;
	auth: SpotifyAuthEndpoint;

	constructor(client: SpotifyGqlApi, auth: SpotifyAuthEndpoint) {
		this.client = client;
		this.auth = auth;
	}

	async sections(_offset = 0, limit = 20) {
		const timeZone = await Timezone.getLocalTimeZone();
		const sections = await this.client.browse.home({
			timeZone,
			spTCookie: this.auth.credentials?.cookies.filter(
				(c) => c.name === "sp_t",
			)[0]?.value as string,
			limit,
		});

		return {
			limit: limit,
			nextOffset: null,
			hasMore: false,
			total: sections.length,
			items: sections.map((section) => {
				const playlists = section.items
					.filter((item) => item.objectType === "Playlist")
					.map(Converters.simplePlaylistFromLibraryV3);
				const albums = section.items
					.filter((item_1) => item_1.objectType === "Album")
					.map(Converters.simpleAlbum);
				const artists = section.items
					.filter((item_2) => item_2.objectType === "Artist")
					.map(Converters.fullArtist);

				return {
					id: section.id,
					title: section.title,
					externalUri:
						section.external_urls.spotify ??
						`https://open.spotify.com/section/${section.id}`,
					browseMore: true,
					typeName: "browse_section",
					items: [...playlists, ...albums, ...artists],
				} satisfies SpotubeBrowseSectionObject;
			}),
		} satisfies SpotubePaginationResponseObject<SpotubeBrowseSectionObject>;
	}

	async sectionItems(id: string, offset = 0, limit = 20) {
		const timeZone = await Timezone.getLocalTimeZone();
		const section = await this.client.browse.homeSection(id, {
			timeZone,
			spTCookie: this.auth.credentials?.cookies.filter(
				(c) => c.name === "sp_t",
			)[0]?.value as string,
			offset,
			limit,
		});

		const res = Converters.paginated(section, (item) => {
			return item.objectType === "Playlist"
				? Converters.simplePlaylistFromLibraryV3(item)
				: item.objectType === "Album"
					? Converters.simpleAlbum(item)
					: Converters.fullArtist(item);
		});

		return res;
	}
}
