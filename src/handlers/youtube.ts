/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Composer, InlineKeyboard } from 'grammy';
import { commandExtractor, hhmmss } from '../utils';
import ytsearch from 'yt-search';
import { playOrQueueSong } from '../tgcalls';
import { escape } from 'html-escaper';

const composer = new Composer();

export default composer;

composer.command(['youtube', 'yt'], async (ctx) => {
  await ctx.api.sendChatAction(ctx.chat.id, 'typing');

  if (ctx.chat.type === 'private')
    return await ctx.reply('This Command works on Group Only');

  let { args: query } = commandExtractor(ctx.message!.text);
  if (!query)
    return await ctx.reply('Please Provide Search Keyword/Youtube Link');

  const { videos } = await ytsearch.search({ query, pages: 1 });
  if (!videos || videos.length < 1) return await ctx.reply('No Results Found');

  let [video] = videos;
  await playOrQueueSong(
    { id: ctx.chat.id, name: ctx.chat.title },
    {
      title: video.title,
      link: video.url,
      image: video.image,
      duration: `${video.duration.seconds}`,
      artist: video.author.name,
      requestedBy: {
        id: ctx.from!.id,
        first_name: ctx.from!.first_name
      },
      mp3_link: video.videoId,
      provider: 'youtube'
    }
  );
});

composer.command(['ytsearch', 'ytsr'], async (ctx) => {
  await ctx.api.sendChatAction(ctx.chat.id, 'typing');

  if (ctx.chat.type === 'private')
    return await ctx.reply('This Command works on Group Only');

  let { args: query } = commandExtractor(ctx.message!.text);
  if (!query)
    return await ctx.reply('Please Provide Search Keyword/Youtube Link');

  const { videos } = await ytsearch.search({ query, pages: 1 });
  if (!videos || videos.length < 1) return await ctx.reply('No Results Found');

  let text = `Search Results for <b>${query}</b>\n\n`;
  let keyboard = new InlineKeyboard();

  videos.slice(0, 10).forEach((data, index) => {
    index += 1;
    text +=
      '<b>' +
      index +
      ':</b> ' +
      '<a href="' +
      data.url +
      '">' +
      escape(data.title) +
      // '(' +
      // hhmmss(data.duration.seconds.toString()) +
      // ')' +
      '</a>\n';
    keyboard.text(`${index}`, 'yt:' + ctx.from?.id + ':' + data.videoId);
    if (!(index % 5)) keyboard.row();
  });

  return await ctx.reply(text, {
    reply_markup: keyboard,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  });
});

composer.callbackQuery(/^yt:\d+:[a-zA-Z0-9.\-_]/, async (ctx) => {
  if (ctx.chat?.type === 'private') return ctx.deleteMessage();

  let query = ctx.callbackQuery.data.split(':');
  let supportedUser = parseInt(query[1], 10);
  let videoId = query[2];
  let clickedBy = ctx.callbackQuery.from.id;

  if (clickedBy !== supportedUser) {
    return await ctx.answerCallbackQuery({
      text: "You aren't allowed",
      show_alert: true
    });
  }

  let video = await ytsearch.search({ videoId });

  await playOrQueueSong(
    { id: ctx.chat?.id!, name: ctx.chat?.title! },
    {
      title: video.title,
      link: video.url,
      image: video.image,
      duration: `${video.duration.seconds}`,
      artist: video.author.name,
      requestedBy: {
        id: ctx.from!.id,
        first_name: ctx.from!.first_name
      },
      mp3_link: videoId,
      provider: 'youtube'
    }
  );

  await ctx.deleteMessage();
});
