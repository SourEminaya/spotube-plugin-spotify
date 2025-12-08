import type { SpotifyGqlApi } from "spotify-gql-client";
import { Converters } from "../converter/converter.js";
import type { IAlbumEndpoint } from "@spotube-app/plugin";

export class AlbumEndpoint implements IAlbumEndpoint {
	client: SpotifyGqlApi;

	constructor(client: SpotifyGqlApi) {
		this.client = client;
	}

	async getAlbum(id: string) {
		const album = await this.client.album.getAlbum(id);
		return Converters.fullAlbum(album);
	}

	async tracks(id: string, offset = 0, limit = 50) {
		const data = await this.client.album.tracks(id, { offset, limit });

		return Converters.paginated(data, (items) => Converters.fullTrack(items));
	}

	async releases(offset = 0, limit = 50) {
		const data = await this.client.album.releases({ offset, limit });

		return Converters.paginated(data, (items) => Converters.fullAlbum(items));
	}

	async save(albumIds: string[]) {
		return this.client.album.save(albumIds);
	}

	async unsave(albumIds: string[]) {
		return this.client.album.unsave(albumIds);
	}
}
