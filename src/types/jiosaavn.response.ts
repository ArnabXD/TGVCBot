/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

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