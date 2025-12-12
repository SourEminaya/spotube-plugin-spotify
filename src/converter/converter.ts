import type {
	Album,
	Artist,
	GqlAlbum,
	GqlAlbumSimplified,
	GqlArtist,
	GqlArtistSimplified,
	GqlPage,
	GqlPlaylistSimplified,
	GqlUser,
	Playlist,
	SimplifiedAlbum,
	SimplifiedArtist,
	Track,
	User,
	UserReference,
} from "spotify-gql-client";
import type {
	SpotubeAlbumType,
	SpotubeFullAlbumObject,
	SpotubeFullArtistObject,
	SpotubeFullPlaylistObject,
	SpotubeImageObject,
	SpotubePaginationResponseObject,
	SpotubeSimpleAlbumObject,
	SpotubeSimpleArtistObject,
	SpotubeSimplePlaylistObject,
	SpotubeTrackObject,
	SpotubeUserObject,
} from "@spotube-app/plugin";

// biome-ignore lint/complexity/noStaticOnlyClass: fvk off
export class Converters {
	static paginated<T, R extends { typeName: string }>(
		data: GqlPage<T>,
		convertItems: (items: T) => R,
	): SpotubePaginationResponseObject<R> {
		const hasMore = data.total > data.offset + data.items.length;

		return {
			limit: Math.trunc(data.limit),
			nextOffset: hasMore ? Math.trunc(data.offset + data.limit) : null,
			hasMore: hasMore,
			total: Math.trunc(data.total),
			items: data.items.map(convertItems),
		};
	}

	static fakePaginated<T, R extends { typeName: string }>(
		data: T[],
		cb: (data: T) => R,
	): SpotubePaginationResponseObject<R> {
		return {
			hasMore: false,
			limit: Math.trunc(data.length),
			nextOffset: null,
			total: Math.trunc(data.length),
			items: data.map(cb),
		};
	}

	static fullTrack(track: Track): SpotubeTrackObject {
		return {
			typeName: "track",
			id: track.id,
			name: track.name,
			externalUri:
				track?.external_urls?.spotify ??
				`https://open.spotify.com/track/${track.id}`,
			explicit: track.explicit ?? false,
			durationMs: track.duration_ms ?? 0,
			isrc: track.external_ids?.isrc ?? "",
			artists: track.artists.map(Converters.simpleArtist),
			album: Converters.simpleAlbum(track.album),
		};
	}

	static fullAlbum(album: Album | GqlAlbum): SpotubeFullAlbumObject {
		return {
			typeName: "album_full",
			id: album.id,
			name: album.name,
			externalUri:
				album.external_urls?.spotify ??
				`https://open.spotify.com/album/${album.id}`,
			releaseDate: album.release_date ?? "",
			totalTracks: (album as Album).total_tracks ?? 0,
			artists: album.artists.map(Converters.simpleArtist),
			images: album.images.map((e)=>({...e, typeName: "image"})),
			albumType: ((album.album_type === "ep"
				? "compilation"
				: album.album_type) ?? "album") as SpotubeAlbumType,
			recordLabel: (album as Album).label ?? null,
			genres: (album as Album).genres ?? null,
		};
	}

	static simpleAlbum(
		album: Album | SimplifiedAlbum | GqlAlbumSimplified,
	): SpotubeSimpleAlbumObject {
		return {
			id: album.id,
			name: album.name,
			externalUri:
				album.external_urls?.spotify ??
				`https://open.spotify.com/album/${album.id}`,
			releaseDate: (album as SimplifiedAlbum).release_date ?? null,
			artists: album.artists.map(Converters.simpleArtist),
			images: album.images.map((e)=>({...e, typeName: "image"})),
			albumType: ((album.album_type === "ep"
				? "compilation"
				: album.album_type) ?? "album") as SpotubeAlbumType,
			typeName: "album_simple",
		};
	}

	static fullArtist(artist: Artist | GqlArtist): SpotubeFullArtistObject {
		return {
			id: artist.id,
			name: artist.name,
			externalUri:
				artist.external_urls?.spotify ??
				`https://open.spotify.com/artist/${artist.id}`,
			images: artist.images.map((e)=>({...e, typeName: "image"})),
			genres: (artist as Artist)?.genres ?? null,
			followers: (artist as Artist)?.followers?.total ?? null,
			typeName: "artist_full",
		};
	}

	static simpleArtist(
		artist: SimplifiedArtist | Artist | GqlArtist | GqlArtistSimplified,
	): SpotubeSimpleArtistObject {
		return {
			typeName: "artist_simple",
			id: artist.id,
			name: artist.name,
			externalUri:
				artist.external_urls?.spotify ??
				`https://open.spotify.com/artist/${artist.id}`,
			images: (artist as Artist)?.images?.map((e)=>({...e, typeName: "image"})),
		};
	}

	static simpleUser(data: User | UserReference | GqlUser): SpotubeUserObject {
		return {
			id: data.id,
			name: data.display_name,
			images:
				((data as User | GqlUser)?.images?.map((e)=>({...e, typeName: "image"})) as
					| SpotubeImageObject[]
					| undefined) ?? [],
			externalUri:
				data.external_urls?.spotify ??
				`https://open.spotify.com/user/${data.id}`,
			typeName: "user",
		};
	}

	static simplePlaylistFromLibraryV3(
		playlist: GqlPlaylistSimplified,
	): SpotubeSimplePlaylistObject {
		return {
			typeName: "playlist_simple",
			id: playlist.id,
			name: playlist.name,
			description: playlist.description,
			images: playlist.images.map((e)=>({...e, typeName: "image"})),
			externalUri:
				playlist.external_urls?.spotify ??
				`https://open.spotify.com/playlist/${playlist.id}`,
			owner: Converters.simpleUser(playlist.owner),
		};
	}

	static fullPlaylist(
		playlist: Playlist | GqlPlaylistSimplified,
	): SpotubeFullPlaylistObject {
		return {
			typeName: "playlist_full",
			collaborators: [],
			id: playlist.id,
			name: playlist.name,
			description: playlist.description,
			images: playlist.images.map((e)=>({...e, typeName: "image"})),
			externalUri:
				playlist.external_urls?.spotify ??
				`https://open.spotify.com/playlist/${playlist.id}`,
			owner: Converters.simpleUser(playlist.owner),
			collaborative: (playlist as Playlist)?.collaborative ?? false,
			public: (playlist as Playlist)?.public ?? false,
		};
	}

	static simplePlaylist(
		playlist: Playlist | GqlPlaylistSimplified,
	): SpotubeSimplePlaylistObject {
		return {
			typeName: "playlist_simple",
			id: playlist.id,
			name: playlist.name,
			description: playlist.description,
			images: playlist.images.map((e)=>({...e, typeName: "image"})),
			externalUri:
				playlist.external_urls?.spotify ??
				`https://open.spotify.com/playlist/${playlist.id}`,
			owner: Converters.simpleUser(playlist.owner),
		};
	}
}
