import type { SpotifyGqlApi } from "spotify-gql-client";
import { Converters } from "../converter/converter.js";
import type { IUserEndpoint } from "@spotube-app/plugin";

export class UserEndpoint implements IUserEndpoint {
	client: SpotifyGqlApi;

	constructor(client: SpotifyGqlApi) {
		this.client = client;
	}

	async me() {
		const user = await this.client.user.me();
		return Converters.simpleUser(user);
	}

	async savedTracks(offset = 0, limit = 50) {
		const data = await this.client.user.savedTracks({ offset, limit });
		return Converters.paginated(data, (items) => Converters.fullTrack(items));
	}

	async savedPlaylists(offset = 0, limit = 50) {
		const data = await this.client.user.savedPlaylists({ offset, limit });
		return Converters.paginated(data, (items) =>
			Converters.fullPlaylist(items),
		);
	}

	async savedAlbums(offset = 0, limit = 50) {
		const data = await this.client.user.savedAlbums({ offset, limit });
		return Converters.paginated(data, (items) => Converters.fullAlbum(items));
	}

	async savedArtists(offset = 0, limit = 50) {
		const data = await this.client.user.savedArtists({ offset, limit });
		return Converters.paginated(data, (items) => Converters.fullArtist(items));
	}

	async isSavedPlaylist(playlistId: string): Promise<boolean> {
		return this.client.user.isPlaylistSaved(playlistId);
	}

	async isSavedTracks(trackIds: string[]): Promise<boolean[]> {
		return this.client.user.isTracksSaved(trackIds);
	}

	async isSavedAlbums(albumIds: string[]): Promise<boolean[]> {
		return this.client.user.isInLibrary(albumIds, { itemType: "album" });
	}

	async isSavedArtists(artistIds: string[]): Promise<boolean[]> {
		return this.client.user.isInLibrary(artistIds, { itemType: "artist" });
	}
}
