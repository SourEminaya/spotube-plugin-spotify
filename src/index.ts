import { SpotifyGqlApi } from "spotify-gql-client";
import { SpotifyAuthEndpoint } from "./segments/auth.js";
import { AlbumEndpoint } from "./segments/album.js";
import { ArtistEndpoint } from "./segments/artist.js";
import { BrowseEndpoint } from "./segments/browse.js";
import { CorePlugin } from "./segments/core.js";
import { PlaylistEndpoint } from "./segments/playlist.js";
import { SearchEndpoint } from "./segments/search.js";
import { TrackEndpoint } from "./segments/track.js";
import { UserEndpoint } from "./segments/user.js";

export default class SpotifyMetadataProviderPlugin {
	auth: SpotifyAuthEndpoint;
	api: SpotifyGqlApi;

	album: AlbumEndpoint;
	artist: ArtistEndpoint;
	browse: BrowseEndpoint;
	playlist: PlaylistEndpoint;
	search: SearchEndpoint;
	track: TrackEndpoint;
	user: UserEndpoint;
	core: CorePlugin;

	constructor() {
		this.api = new SpotifyGqlApi();
		this.auth = new SpotifyAuthEndpoint((_event) => {
			this.api.setAccessToken(this.auth.credentials?.accessToken);
		});
		this.album = new AlbumEndpoint(this.api);
		this.artist = new ArtistEndpoint(this.api);
		this.browse = new BrowseEndpoint(this.api, this.auth);
		this.playlist = new PlaylistEndpoint(this.api);
		this.search = new SearchEndpoint(this.api);
		this.track = new TrackEndpoint(this.api);
		this.user = new UserEndpoint(this.api);
		this.core = new CorePlugin();
	}
}
