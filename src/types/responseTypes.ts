export interface JioSaavnSongSearchResponse {
    id: string;
    title: string;
    image: string;
    album: string;
    description: string;
    position: number;
    more_info: {
        vlink: string;
        primary_artists: string;
        singers: string;
        language: string;
    };
    url: string;
}


export interface JioSaavnSongResponse {
    id: string;
    song: string;
    album: string;
    year: string;
    primary_artists: string;
    singers: string;
    image: string;
    label: string;
    albumid: string;
    language: string;
    copyright_text: string;
    has_lyrics: string;
    media_url: string;
    other_qualities: {
        quality: string;
        url: string;
    }[];
    perma_url: string;
    album_url: string;
    release_date: string;
    repo_url: string;
}


export interface DeezerResponse {
    id: number;
    readable: boolean;
    title: string;
    title_short: string;
    title_version: string;
    link: string;
    duration: number;
    rank: number;
    explicit_lyrics: boolean;
    explicit_content_lyrics: number;
    explicit_content_cover: number;
    preview: string;
    md5_image: string;
    artist: DeezerArtist;
    album: DeezerAlbum;
    type: string;
    raw_link: string;
}

export interface DeezerAlbum {
    id: number;
    title: string;
    cover: string;
    cover_small: string;
    cover_medium: string;
    cover_big: string;
    cover_xl: string;
    md5_image: string;
    tracklist: string;
    type: string;
}

export interface DeezerArtist {
    id: number;
    name: string;
    link: string;
    picture: string;
    picture_small: string;
    picture_medium: string;
    picture_big: string;
    picture_xl: string;
    tracklist: string;
    type: string;
}
