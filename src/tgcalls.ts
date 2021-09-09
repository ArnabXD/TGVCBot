/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { GramTGCalls } from 'gram-tgcalls';
import { userbot } from './userbot';
import bot from './bot';
import env from './env';
import { Chat } from './types/chat';
import { Ytmp3 } from './types/ytmp3.response';
import { queue, QueueData } from './queue';
import { escape } from 'html-escaper';
import { ffmpeg } from './ffmpeg';
import { sendPlayingMessage, getDownloadLink } from './utils';
import axios from 'axios';

const streamParams = {
  bitsPerSample: 16,
  sampleRate: 65000,
  channelCount: 1
};

class TGCalls {
  private gramTgCalls: Map<number, GramTGCalls>;

  constructor() {
    this.gramTgCalls = new Map<number, GramTGCalls>();
  }

  private init(chat: number) {
    this.gramTgCalls.set(chat, new GramTGCalls(userbot, chat));
    return this.gramTgCalls.get(chat) as GramTGCalls;
  }

  has(chat: number) {
    return this.gramTgCalls.has(chat);
  }

  connected(chat: number) {
    let tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) return false;
    if (!tgcalls.audioFinished() || !tgcalls.videoFinished()) {
      return true;
    }
    return false;
  }

  finished(chat: number) {
    let tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) return false;
    return !!(tgcalls.audioFinished() && tgcalls.videoFinished());
  }

  pause(chat: number) {
    let tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) return false;
    if (
      !tgcalls.audioFinished() &&
      tgcalls.videoFinished() &&
      tgcalls.pauseAudio()
    ) {
      return true;
    }
    if (
      !tgcalls.audioFinished() &&
      !tgcalls.videoFinished() &&
      tgcalls.pauseAudio() &&
      tgcalls.pauseVideo()
    ) {
      return true;
    }
    return true;
  }

  resume(chat: number) {
    let tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) return false;
    if (
      !tgcalls.audioFinished() &&
      tgcalls.videoFinished() &&
      tgcalls.resumeAudio()
    ) {
      return true;
    }
    if (
      !tgcalls.audioFinished() &&
      !tgcalls.videoFinished() &&
      tgcalls.resumeAudio() &&
      tgcalls.resumeVideo()
    ) {
      return true;
    }
    return true;
  }

  async stop(chat: number) {
    let tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) return false;
    if (await tgcalls.stop()) {
      return true;
    }
    return false;
  }

  private onFinish(chat: Chat, kill: () => any) {
    let next = queue.get(chat.id);
    if (next) {
      this.streamOrQueue(chat, next);
    }
    kill();
    this.gramTgCalls.delete(chat.id);
  }

  async streamOrQueue(chat: Chat, data: QueueData, force: boolean = false) {
    if (parseInt(data.duration, 10) > env.MAX_DURATION) {
      return await bot.api.sendMessage(
        chat.id,
        `<a href="${data.link}">${escape(
          data.title
        )}</> exceeded maximum supported duration, Skipped`,
        {
          parse_mode: 'HTML',
          disable_web_page_preview: true
        }
      );
    }

    if (this.connected(chat.id) && !this.finished(chat.id) && !force) {
      let position = queue.push(chat.id, data);
      return await bot.api.sendMessage(
        chat.id,
        `<a href="${data.link}">${escape(
          data.title
        )}</a> Queued at Postion ${position} by <a href="tg://user?id=${
          data.requestedBy.id
        }">${escape(data.requestedBy.first_name)}</a>`,
        {
          disable_web_page_preview: true,
          parse_mode: 'HTML'
        }
      );
    }

    let tgcalls = this.gramTgCalls.get(chat.id)
      ? (this.gramTgCalls.get(chat.id) as GramTGCalls)
      : this.init(chat.id);

    if (data.provider === 'jiosaavn') {
      let [readable, killProcess] = await ffmpeg(data.mp3_link);
      await tgcalls.stream({
        readable: readable,
        options: {
          ...streamParams,
          onFinish: () => this.onFinish(chat, killProcess)
        }
      });
      await sendPlayingMessage(chat, data);
    }

    if (data.provider === 'telegram') {
      let mp3_link = await getDownloadLink(data.mp3_link);
      let poster = data.image.startsWith('http')
        ? data.image
        : await getDownloadLink(data.image);

      let [readable, killProcess] = await ffmpeg(mp3_link);
      await tgcalls.stream({
        readable: readable,
        options: {
          ...streamParams,
          onFinish: () => this.onFinish(chat, killProcess)
        }
      });
      await sendPlayingMessage(chat, { ...data, image: poster });
    }

    if (data.provider === 'youtube') {
      let response = (
        await axios.get<Ytmp3>(
          `https://apis.arnabxd.me/ytmp3?id=${data.mp3_link}`
        )
      ).data;

      let audio =
        response.audio.filter((d) => d.itag === 251).length > 0
          ? response.audio.filter((d) => d.itag === 251)[0]
          : response.audio[0];
      let [readable, kill] = await ffmpeg(audio.url);

      if (!readable) {
        await bot.api.sendMessage(
          chat.id,
          'Failed to stream the song. Inaccessible link. Try again later'
        );
        this.onFinish(chat, kill);
        return;
      }

      await tgcalls.stream({
        readable: readable,
        options: {
          ...streamParams,
          onFinish: () => this.onFinish(chat, kill)
        }
      });
    }

    if (data.provider === 'ytvideo') {
      let response = (
        await axios.get<Ytmp3>(
          `https://apis.arnabxd.me/ytmp3?id=${data.mp3_link}`
        )
      ).data;

      let audio =
        response.audio.filter((d) => d.itag === 251)[0] || response.audio[0];

      let video =
        response.video.filter((d) => d.itag === 135)[0] || response.video[0];

      let [audioStream, killAudioOutput] = await ffmpeg(audio.url);
      let [videoStream, killVideoOutput] = await ffmpeg(video.url, true);

      if (!audioStream || !videoStream) {
        await bot.api.sendMessage(
          chat.id,
          'Failed to stream the song. Inaccessible link. Try again later'
        );
        this.onFinish(chat, () => {
          killAudioOutput();
          killVideoOutput();
        });
        return;
      }

      await tgcalls.stream(
        {
          readable: audioStream,
          options: {
            ...streamParams
          }
        },
        {
          readable: videoStream,
          options: {
            onFinish: () =>
              this.onFinish(chat, () => {
                killAudioOutput();
                killVideoOutput();
              })
          }
        }
      );
    }
  }
}

export const tgcalls = new TGCalls();
