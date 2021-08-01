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
    duration: string;
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