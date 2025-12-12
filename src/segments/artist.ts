import type { SpotifyGqlApi } from "spotify-gql-client";
import { Converters } from "../converter/converter.js";
import type { IArtistEndpoint } from "@spotube-app/plugin";

export class ArtistEndpoint implements IArtistEndpoint {
	client: SpotifyGqlApi;

	constructor(client: SpotifyGqlApi) {
		this.client = client;
	}

	async getArtist(id: string) {
		const artist = await this.client.artist.getArtist(id);
		return Converters.fullArtist(artist);
	}

	async topTracks(id: string, _offset = 0, _limit = 20) {
		const data = await this.client.artist.topTracks(id);

		return Converters.fakePaginated(data.tracks, Converters.fullTrack);
	}

	async albums(id: string, offset = 0, limit = 50) {
		const data = await this.client.artist.albums(id, { offset, limit });

		return Converters.paginated(data, (items) => Converters.simpleAlbum(items));
	}

	async save(artistIds: string[]) {
		return this.client.artist.follow(artistIds);
	}

	async unsave(artistIds: string[]) {
		return this.client.artist.unfollow(artistIds);
	}

	async related(id: string, _offset = 0, _limit = 20) {
		const data = await this.client.artist.related(id);
		return Converters.fakePaginated(data, Converters.fullArtist);
	}
}
