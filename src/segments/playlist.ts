import type { SpotifyGqlApi } from "spotify-gql-client";
import { Converters } from "../converter/converter.js";
import type { IPlaylistEndpoint } from "@spotube-app/plugin";

export class PlaylistEndpoint implements IPlaylistEndpoint {
	client: SpotifyGqlApi;

	constructor(client: SpotifyGqlApi) {
		this.client = client;
	}

	async getPlaylist(id: string) {
		const playlist = await this.client.playlist.getPlaylist(id);
		return Converters.fullPlaylist(playlist);
	}

	async tracks(id: string, offset = 0, limit = 50) {
		const data = await this.client.playlist.tracks(id, { offset, limit });

		const paginated = Converters.paginated(data, Converters.fullTrack);

		// Spotify playlists can contain local tracks which do not have an ID and cannot be played
		// We filter them out here to avoid issues in the client
		paginated.items = paginated.items.filter(
			(item) => item != null && item.id != null,
		);

		return paginated;
	}

	async createPlaylist(
		userId: string,
		name: string,
		description?: string,
		isPublic?: boolean,
		collaborative?: boolean,
	) {
		const playlist = await this.client.playlist.create(userId, {
			name,
			description,
			public: isPublic,
			collaborative,
		});
		return Converters.fullPlaylist(playlist);
	}

	async updatePlaylist(
		playlistId: string,
		name?: string,
		description?: string,
		isPublic?: boolean,
		collaborative?: boolean,
	) {
		return this.client.playlist.update(playlistId, {
			name,
			description,
			public: isPublic,
			collaborative,
		});
	}

	async deletePlaylist(playlistId: string) {
		return this.unsave(playlistId);
	}

	async addTracks(playlistId: string, trackIds: string[], position?: number) {
		const uris = trackIds.map((id) => `spotify:track:${id}`);
		return this.client.playlist.addTracks(playlistId, { uris, position });
	}

	async removeTracks(playlistId: string, trackIds: string[]) {
		const uris = trackIds.map((id) => `spotify:track:${id}`);
		return this.client.playlist.removeTracks(playlistId, { uris });
	}

	async save(playlistId: string) {
		return this.client.playlist.follow(playlistId);
	}

	async unsave(playlistId: string) {
		return this.client.playlist.unfollow(playlistId);
	}
}
