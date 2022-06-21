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
import { YouTube as ytsr } from 'youtube-sr';
import env from '../env';

class YouTube extends StreamProvider {
  constructor() {
    super('youtube');
  }

  async search(key: string) {
    const resp = await ytsr.search(key, {
      type: 'video',
      limit: 10,
      safeSearch: true
    });
    return resp.map((res) => ({
      ...res,
      id: res.id || 'dQw4w9WgXcQ',
      title: res.title || 'Unknown',
      artist: res.channel?.name || 'Unknown',
      duration: res.durationFormatted
    }));
  }

  async getSong(id: string, from: User): Promise<QueueData> {
    const song = await ytsr.searchOne(id);
    return {
      link: song.url,
      title: song.title || 'Unknown',
      image: song.thumbnail?.url || env.THUMBNAIL,
      artist: song.channel?.name || 'Unknown',
      duration: song.durationFormatted,
      requestedBy: {
        id: from.id,
        first_name: from.first_name
      },
      mp3_link: song.id || 'dQw4w9WgXcQ',
      provider: this.provider
    };
  }
}

export const yt = new YouTube();
