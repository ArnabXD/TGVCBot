/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import StreamProvider from './base';
import { User } from '@grammyjs/types';
import { QueueData } from '../queue';

import axios from 'axios';

export interface JioSaavnSearchResponse {
  status: boolean;
  serverTime: number;
  searchQuery: string;
  results: Result[];
}

interface Result {
  id: string;
  title: string;
  image: string;
  images: { [key: string]: string };
  album: string;
  description: string;
  more_info: {
    vlink?: string;
    singers: string;
    language: string;
    album_id: string;
  };
  perma_url: string;
  api_url: { [key: string]: string };
}

export interface JioSaavnSongResponse {
  status: boolean;
  serverTime: number;
  id: string;
  song: string;
  album: string;
  year: number;
  primary_artists: string;
  singers: string;
  image: string;
  images: { [key: string]: string };
  duration: string;
  label: string;
  albumid: string;
  language: string;
  copyright_text: string;
  has_lyrics: boolean;
  lyrics: null;
  media_url: string;
  media_urls: { [key: string]: string };
  perma_url: string;
  album_url: string;
  release_date: string;
  api_url: {
    song: string;
    album: string;
  };
}

type JioSaavnResults = Result[];

class JioSaavn extends StreamProvider {
  constructor() {
    super('jiosaavn');
  }

  async search(key: string): Promise<JioSaavnResults | undefined> {
    const query = new URLSearchParams({
      query: key.replace(/\s/g, '+')
    });
    const { data } = await axios.get<JioSaavnSearchResponse>(
      'https://jsvn-tgvc.vercel.app/search?' + query.toString()
    );
    if (data && data.results && data.results.length) {
      return data.results.map((_data) => ({
        ..._data,
        title: _data.title.replace(/&quot;/g, `"`)
      }));
    }
  }

  async getSong(id: string, from: User): Promise<QueueData> {
    const resp = await axios.get<JioSaavnSongResponse>(
      'https://jsvn-tgvc.vercel.app/song?id=' + id
    );
    const song = resp.data;
    return {
      link: song.perma_url,
      title: song.song.replace(/&quot;/g, `"`),
      image: song.image,
      artist: song.singers || song.primary_artists,
      duration: song.duration,
      requestedBy: {
        id: from.id,
        first_name: from.first_name
      },
      mp3_link: song.media_urls['96_KBPS'] ?? song.media_url,
      provider: this.provider
    };
  }
}

export const jiosaavn = new JioSaavn();
