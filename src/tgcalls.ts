/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { GramTGCalls, AudioOptions } from 'tgcalls-next';
import { userbot } from './userbot';
import bot from './bot';
import env from './env';
import { Chat } from './types/chat';
import { queue, QueueData } from './queue';
import { escape } from 'html-escaper';
import { ffmpeg } from './ffmpeg';
import { sendPlayingMessage, getDownloadLink } from './utils';

const streamParams: AudioOptions = {
  bps: 16,
  bitrate: 48000,
  channels: 1
};

class TGVCCalls {
  private gramTgCalls: Map<number, GramTGCalls>;

  constructor() {
    this.gramTgCalls = new Map<number, GramTGCalls>();
  }

  private init(chat: Chat) {
    const _TGCALLS = new GramTGCalls(userbot, chat.id);
    _TGCALLS.addListener('audio-finish', () => {
      this.onStreamFinish(chat);
    });
    _TGCALLS.addListener('audio-error', (e) => {
      this.onStreamError(e as Error, chat);
    });
    this.gramTgCalls.set(chat.id, _TGCALLS);
    return this.gramTgCalls.get(chat.id) as GramTGCalls;
  }

  private async onStreamFinish(chat: Chat): Promise<void> {
    const next = queue.get(chat.id);
    if (!next) {
      const call = this.gramTgCalls.get(chat.id);
      this.gramTgCalls.delete(chat.id);
      call?.stop();
      return;
    }
    await this.streamOrQueue(chat, next);
  }

  private async onStreamError(error: Error, chat: Chat): Promise<void> {
    console.error(error);
    const errorMessage = error.message || String(error);

    if (errorMessage.includes('No active call')) {
      queue.clear(chat.id);
      this.gramTgCalls.delete(chat.id);
      return;
    }

    await this.onStreamFinish(chat);
  }

  has(chat: number) {
    return this.gramTgCalls.has(chat);
  }

  delete(chat: number) {
    return this.gramTgCalls.delete(chat);
  }

  connected(chat: number) {
    const tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) {return false;}
    if (!tgcalls.finished) {
      return true;
    }
    return false;
  }

  finished(chat: number) {
    const tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) {return false;}
    return !!tgcalls.finished;
  }

  pause(chat: number) {
    const tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) {return false;}
    if (!tgcalls.finished && tgcalls.pause()) {
      return true;
    }
    return false;
  }

  resume(chat: number) {
    const tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) {return false;}
    if (!tgcalls.finished && tgcalls.resume()) {
      return true;
    }
    return false;
  }

  async stop(chat: number) {
    const tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) {return false;}
    if (await tgcalls.stop()) {
      return true;
    }
    return false;
  }

  async streamOrQueue(chat: Chat, data: QueueData, force = false) {
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
      const position = queue.push(chat.id, data);
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

    const tgcalls = this.gramTgCalls.get(chat.id)
      ? (this.gramTgCalls.get(chat.id) as GramTGCalls)
      : this.init(chat);

    if (data.provider === 'jiosaavn') {
      const [readable] = await ffmpeg(data.mp3_link);
      await tgcalls.stream({
        audio: readable,
        audioOptions: streamParams
      });
      await sendPlayingMessage(chat, data);
    }

    if (data.provider === 'telegram') {
      const mp3_link = await getDownloadLink(data.mp3_link);
      const poster = data.image.startsWith('http')
        ? data.image
        : await getDownloadLink(data.image);

      const [readable] = await ffmpeg(mp3_link);
      await tgcalls.stream({
        audio: readable,
        audioOptions: streamParams
      });
      await sendPlayingMessage(chat, { ...data, image: poster });
    }

    if (data.provider === 'radio') {
      const [readable] = await ffmpeg(data.mp3_link);
      await tgcalls.stream({
        audio: readable,
        audioOptions: streamParams
      });
      await sendPlayingMessage(chat, data);
    }
  }
}

export const tgcalls = new TGVCCalls();
