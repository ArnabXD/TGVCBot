/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { GramTGCalls, AudioOptions } from 'tgcalls-next';
import { escape } from 'html-escaper';
import ytdl from 'ytdl-core';

import bot from './bot';
import { userbot } from './userbot';
import { Chat } from './types/chat';
import { queue, QueueData } from './queue';
import { getReadable } from './ffmpeg';
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

  /**
   * Creates TGCalls instance for a chat
   *
   * @param chat Chat
   * @returns void
   */
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

  /**
   * onStreamFinish is called when the stream is finished
   *
   * @param chat
   * @returns Promise<void>
   */
  private async onStreamFinish(chat: Chat): Promise<void> {
    const next = await queue.get(chat.id);
    if (!next) {
      const call = this.gramTgCalls.get(chat.id);
      this.gramTgCalls.delete(chat.id);
      call?.stop();
      return;
    }
    await this.streamOrQueue(chat, {
      ...next,
      requestedBy: { id: next.req_by_id, first_name: next.req_by_fname }
    });
  }

  /**
   * onStreamError is called when the tgcalls stream encounters an error
   *
   * @param error Error
   * @param chat Chat
   * @returns Promise<void>
   */
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

  /**
   * Checks if tgcalls has been initialized for the chat
   *
   * @param chat Chat
   * @returns boolean
   */
  has(chat: number) {
    return this.gramTgCalls.has(chat);
  }

  /**
   * Deletes the tgcalls instance for the chat
   *
   * @param chat number
   * @returns boolean
   */
  delete(chat: number) {
    return this.gramTgCalls.delete(chat);
  }

  /**
   * Checks whether the stream is playing or not
   *
   * @param chat number
   * @returns boolean
   */
  connected(chat: number) {
    const tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) {
      return false;
    }
    if (!tgcalls.finished) {
      return true;
    }
    return false;
  }

  /**
   * Checks if the stream is finished
   *
   * @param chat number
   * @returns boolean
   */
  finished(chat: number) {
    const tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) {
      return true;
    }
    return !!tgcalls.finished;
  }

  /**
   * Pause the stream if it is playing
   *
   * @param chat number
   * @returns boolean
   */
  pause(chat: number) {
    const tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) {
      return false;
    }
    if (!tgcalls.finished && tgcalls.pause()) {
      return true;
    }
    return false;
  }

  /**
   * Resume the stream if it is paused
   *
   * @param chat number
   * @returns boolean
   */
  resume(chat: number) {
    const tgcalls = this.gramTgCalls.get(chat);
    if (!tgcalls) {
      return false;
    }
    if (!tgcalls.finished && tgcalls.resume()) {
      return true;
    }
    return false;
  }

  /**
   * Destroy the stream and remove tgcalls instance
   *
   * @param chat number
   * @returns boolean
   */
  async stop(chat: number) {
    await queue.clear(chat);
    const tgcalls = this.gramTgCalls.get(chat);
    this.gramTgCalls.delete(chat);
    if (!tgcalls) {
      return false;
    }
    if (await tgcalls.stop()) {
      return true;
    }
    return false;
  }

  /**
   * If the stream is playing the queue the song otherwise play the song.
   *
   * @param chat Chat
   * @param data QueueData
   * @param force boolean - Force the song to play
   * @returns
   */
  async streamOrQueue(chat: Chat, data: QueueData, force = false) {
    if (this.connected(chat.id) && !this.finished(chat.id) && !force) {
      const position = await queue.push(chat.id, data);
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

    try {
      const _tgcalls = this.gramTgCalls.get(chat.id)
        ? (this.gramTgCalls.get(chat.id) as GramTGCalls)
        : this.init(chat);

      switch (data.provider) {
        case 'jiosaavn': {
          const readable = getReadable(data.mp3_link);
          await _tgcalls.stream({
            audio: readable,
            audioOptions: streamParams
          });
          await sendPlayingMessage(chat, data);
          break;
        }
        case 'telegram': {
          const mp3_link = await getDownloadLink(data.mp3_link);
          const poster = data.image.startsWith('http')
            ? data.image
            : await getDownloadLink(data.image);

          const readable = getReadable(mp3_link);
          await _tgcalls.stream({
            audio: readable,
            audioOptions: streamParams
          });
          await sendPlayingMessage(chat, { ...data, image: poster });
          break;
        }
        case 'radio': {
          const readable = getReadable(data.mp3_link);
          await _tgcalls.stream({
            audio: readable,
            audioOptions: streamParams
          });
          await sendPlayingMessage(chat, data);
          break;
        }
        case 'youtube': {
          const video = await ytdl.getInfo(data.mp3_link);
          let [audio] = video.formats.filter((v) => v.itag === 251);
          if (!audio) {
            audio = video.formats[0];
          }
          const readable = getReadable(audio.url);
          await _tgcalls.stream({
            audio: readable,
            audioOptions: streamParams
          });
          await sendPlayingMessage(chat, data);
          break;
        }
      }
      await queue.setCurrent(chat.id, data);
    } catch (e) {
      //
    }
  }
}

export const tgcalls = new TGVCCalls();
