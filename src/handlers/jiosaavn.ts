/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Composer, InlineKeyboard } from 'grammy';
import axios from 'axios';
import { escape } from 'html-escaper';
import { stringify } from 'querystring';
import { commandExtractor } from '../utils';
import {
  JioSaavnSongResponse,
  JioSaavnSongSearchResponse
} from '../types/jiosaavn.response';
import { tgcalls } from '../tgcalls';

const composer = new Composer();

composer.use(async (ctx, next) => {
  if (ctx?.chat?.type === 'private') {
    return await ctx.reply('This Command works on Group Only');
  }
  await next();
});

composer.command(['jiosaavn', 'jsvn'], async (ctx) => {
  await ctx.api.sendChatAction(ctx.chat.id, 'record_voice');

  const { args: keyword } = commandExtractor(ctx.message?.text || '');
  if (!keyword) {
    await ctx.reply('Please Provide Search Keyword');
    return;
  }

  const query = stringify({ query: keyword.replace(/\s/g, '+') });
  const resp = (
    await axios.get<JioSaavnSongSearchResponse[]>(
      `https://jiosaavn-api.vercel.app/search?${query}`
    )
  ).data;

  if (!resp[0]) {
    await ctx.reply('No Results Found');
    return;
  }

  const [result] = resp;
  const song = (
    await axios.get<JioSaavnSongResponse>(
      `https://jiosaavn-api.vercel.app/song?id=${result.id}`
    )
  ).data;

  if ('title' in ctx.chat && ctx.from) {
    await tgcalls.streamOrQueue(
      { id: ctx.chat.id, name: ctx.chat.title },
      {
        link: song.perma_url,
        title: song.song.replace(/&quot;/g, `"`),
        image: song.image,
        artist: song.singers || song.primary_artists,
        duration: song.duration,
        requestedBy: {
          id: ctx.from.id,
          first_name: ctx.from.first_name
        },
        mp3_link: song.other_qualities.pop()?.url ?? song.media_url,
        provider: 'jiosaavn'
      }
    );
  }
});

composer.command(['jiosaavnsearch', 'jsvnsearch', 'jsvnsr'], async (ctx) => {
  await ctx.api.sendChatAction(ctx.chat.id, 'typing');

  const { args: keyword } = commandExtractor(ctx.message?.text || '');
  if (!keyword) {
    await ctx.reply('Please Provide Search Keyword');
    return;
  }

  const query = stringify({ query: keyword.replace(/\s/g, '+') });
  const resp = (
    await axios.get<JioSaavnSongSearchResponse[]>(
      `https://jiosaavn-api.vercel.app/search?${query}`
    )
  ).data;

  if (!resp[0]) {
    await ctx.reply('No Results Found');
    return;
  }

  let text = `Search Results for <b>${keyword}</b>\n\n`;
  const keyboard = new InlineKeyboard();

  resp.slice(0, 10).forEach((data, index) => {
    index += 1;
    text +=
      '<b>' +
      index +
      ':</b> ' +
      '<a href="' +
      data.url +
      '">' +
      escape(data.title.replace(/&quot;/g, `"`)) +
      '</a>\n';
    keyboard.text(`${index}`, 'jsvn:' + ctx.from?.id + ':' + data.id);
    if (!(index % 5)) {
      keyboard.row();
    }
  });

  return await ctx.reply(text, {
    reply_markup: keyboard,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  });
});

composer.callbackQuery(/^jsvn:\d+:[a-zA-Z0-9.\-_]/, async (ctx) => {
  const query = ctx.callbackQuery.data.split(':');
  const supportedUser = parseInt(query[1], 10);
  const songId = query[2];
  const clickedBy = ctx.callbackQuery.from.id;

  if (clickedBy !== supportedUser) {
    return await ctx.answerCallbackQuery({
      text: "You aren't allowed",
      show_alert: true
    });
  }

  const song = (
    await axios.get<JioSaavnSongResponse>(
      'https://jiosaavn-api.vercel.app/song?id=' + songId
    )
  ).data;

  if (ctx.chat && 'title' in ctx.chat && ctx.from) {
    await tgcalls.streamOrQueue(
      {
        id: ctx.chat.id,
        name: ctx.chat.title
      },
      {
        link: song.perma_url,
        title: song.song.replace(/&quot;/g, `"`),
        image: song.image,
        artist: song.singers,
        duration: song.duration,
        requestedBy: {
          id: ctx.from.id,
          first_name: ctx.from.first_name
        },
        mp3_link: song.other_qualities.pop()?.url ?? song.media_url,
        provider: 'jiosaavn'
      }
    );
  }

  await ctx.deleteMessage();
});

export default composer;
