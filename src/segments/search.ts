import type { SpotifyGqlApi } from "spotify-gql-client";
import { Converters } from "../converter/converter.js";
import type {
	ISearchEndpoint,
	SpotubeSearchResponseObject,
} from "@spotube-app/plugin";

export class SearchEndpoint implements ISearchEndpoint {
	client: SpotifyGqlApi;

	constructor(client: SpotifyGqlApi) {
		this.client = client;
	}

	chips(): string[] {
		// can be tracks, playlists, artists, albums and all
		return ["all", "tracks", "albums", "artists", "playlists"];
	}

	async all(query: string) {
		const data = await this.client.search.all(query, { limit: 20 });

		return {
			typeName: "search_response",
			artists: data.artists.map(Converters.fullArtist),
			albums: data.albums.map(Converters.simpleAlbum),
			tracks: data.tracks.map(Converters.fullTrack),
			playlists: data.playlists.map(Converters.simplePlaylistFromLibraryV3),
		} satisfies SpotubeSearchResponseObject;
	}

	async albums(query: string, offset = 0, limit = 50) {
		const data = await this.client.search.albums(query, { offset, limit });

		return Converters.paginated(data, (items) => Converters.fullAlbum(items));
	}

	async artists(query: string, offset = 0, limit = 50) {
		const data = await this.client.search.artists(query, { offset, limit });

		return Converters.paginated(data, (items) => Converters.fullArtist(items));
	}

	async tracks(query: string, offset = 0, limit = 50) {
		const data = await this.client.search.tracks(query, { offset, limit });

		return Converters.paginated(data, (items) => Converters.fullTrack(items));
	}

	async playlists(query: string, offset = 0, limit = 50) {
		const data = await this.client.search.playlists(query, { offset, limit });

		return Converters.paginated(data, (items) =>
			Converters.fullPlaylist(items),
		);
	}
}
