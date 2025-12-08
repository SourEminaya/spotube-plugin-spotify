import type { SpotifyGqlApi } from "spotify-gql-client";
import { Converters } from "../converter/converter.js";
import type { ITrackEndpoint } from "@spotube-app/plugin";

export class TrackEndpoint implements ITrackEndpoint {
	client: SpotifyGqlApi;

	constructor(client: SpotifyGqlApi) {
		this.client = client;
	}

	async getTrack(id: string) {
		const track = await this.client.track.getTrack(id);
		return Converters.fullTrack(track);
	}

	async save(trackIds: string[]): Promise<void> {
		await this.client.track.save(trackIds);
	}

	async unsave(trackIds: string[]): Promise<void> {
		await this.client.track.unsave(trackIds);
	}

	async radio(trackId: string) {
		const track = await this.client.track.getTrack(trackId);
		const query = `${track.name} Radio`;

		const searchData = await this.client.search.playlists(query, {
			limit: 20,
		});
		const playlists = searchData.items;
		const radioPlaylist = playlists.find(
			(playlist) => playlist.name === query,
		);

		if (!radioPlaylist) {
			return [];
		}

		const playlistData = await this.client.playlist.tracks(
			radioPlaylist.id,
			{
				offset: 0,
				limit: 50,
			},
		);

		return playlistData.items.map((t) => Converters.fullTrack(t));
	}
}
