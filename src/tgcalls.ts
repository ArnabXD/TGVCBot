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

export const TgCalls = new GramTGCalls(userbot);

const streamParams = {
  bitsPerSample: 16,
  sampleRate: 65000,
  channelCount: 1,
};

export const onFinish = async (chat: Chat) => {
  let next = queue.get(chat.id);
  if (next) return playOrQueueSong(chat, next);
  await TgCalls.stop(chat.id);
};

export const playOrQueueSong = async (
  chat: Chat,
  data: QueueData,
  force: boolean = false,
) => {
  if (parseInt(data.duration, 10) > env.MAX_DURATION) {
    return await bot.api.sendMessage(
      chat.id,
      `<a href="${data.link}">${escape(
        data.title,
      )}</> exceeded maximum supported duration, Skipped`,
      {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      },
    );
  }

  if (TgCalls.connected(chat.id) && !TgCalls.finished(chat.id) && !force) {
    let position = queue.push(chat.id, data);
    return await bot.api.sendMessage(
      chat.id,
      `<a href="${data.link}">${escape(
        data.title,
      )}</a> Queued at Postion ${position} by <a href="tg://user?id=${
        data.requestedBy.id
      }">${escape(data.requestedBy.first_name)}</a>`,
      {
        disable_web_page_preview: true,
        parse_mode: 'HTML',
      },
    );
  }

  if (data.provider === 'jiosaavn') {
    let FFMPEG = ffmpeg(data.mp3_link);
    await TgCalls.stream(chat.id, FFMPEG, {
      onFinish: () => onFinish(chat),
      stream: streamParams,
    });
    await sendPlayingMessage(chat, data);
  }

  if (data.provider === 'telegram') {
    let mp3_link = await getDownloadLink(data.mp3_link);
    let poster = data.image.startsWith('http')
      ? data.image
      : await getDownloadLink(data.image);

    let FFMPEG = ffmpeg(mp3_link);
    await TgCalls.stream(chat.id, FFMPEG, {
      onFinish: () => onFinish(chat),
      stream: streamParams,
    });
    await sendPlayingMessage(chat, { ...data, image: poster });
  }

  if (data.provider === 'youtube') {
    let response = (
      await axios.get<Ytmp3>(
        `https://apis.arnabxd.me/ytmp3?id=${data.mp3_link}`,
      )
    ).data;

    let audio =
      response.audio.filter(d => d.itag === 251).length > 0
        ? response.audio.filter(d => d.itag === 251)[0]
        : response.audio[0];
    let readable = ffmpeg(audio.url);

    await TgCalls.stream(chat.id, readable, {
      onFinish: () => onFinish(chat),
      stream: streamParams,
    });
    await sendPlayingMessage(chat, data);
  }
};
