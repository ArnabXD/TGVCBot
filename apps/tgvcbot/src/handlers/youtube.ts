/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Composer, InlineKeyboard } from 'grammy';
import { yt } from '../providers/youtube';
import { tgcalls } from '../tgcalls';
import { escape } from 'html-escaper';

const composer = new Composer();

composer.command(['youtube', 'yt'], async (ctx) => {
  await ctx.api.sendChatAction(ctx.chat.id, 'typing');
  if (ctx?.chat?.type === 'private') {
    return await ctx.reply('This Command works on Group Only');
  }
  if (!ctx.match) {
    await ctx.reply('Please Provide Search Keyword');
    return;
  }
  const result = await yt.search(ctx.match);
  if (!result) {
    await ctx.reply('No Results Found');
    return;
  }
  if ('title' in ctx.chat && ctx.from) {
    const songData = await yt.getSong(result[0].id, ctx.from);
    await tgcalls.streamOrQueue(
      { id: ctx.chat.id, name: ctx.chat.title },
      songData
    );
  }
});

composer.command(['ytsr', 'ytsearch'], async (ctx) => {
  if (ctx?.chat?.type === 'private') {
    return await ctx.reply('This Command works on Group Only');
  }
  if (!ctx.match) {
    await ctx.reply('Please Provide Search Keyword');
    return;
  }
  await ctx.api.sendChatAction(ctx.chat.id, 'typing');
  let result = await yt.search(ctx.match);
  if (!result) {
    await ctx.reply('No Results Found');
    return;
  }
  result = result.slice(0, 10);
  let text = `Search Results for <b>${escape(ctx.match)}</b>\n\n`;
  const keyboard = new InlineKeyboard();
  result.forEach((res, index) => {
    index++;
    text +=
      `${('00' + index).slice(-2)} : <b><a href="https://youtu.be/${
        res.id
      }">${escape(res.title)}</a> (${res.durationFormatted})</b>\n` +
      `<b>By :</b> ${escape(res.artist)}\n\n`;
    keyboard.text(`${index}`, 'yt:' + ctx.from?.id + ':' + res.id);
    if (!(index % 5)) {
      keyboard.row();
    }
  });
  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
    disable_web_page_preview: true
  });
});

composer.callbackQuery(/^yt:\d+:[a-zA-Z0-9.\-_]/, async (ctx) => {
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
  if (ctx.chat && 'title' in ctx.chat && ctx.from) {
    const songData = await yt.getSong(songId, ctx.from);
    await tgcalls.streamOrQueue(
      {
        id: ctx.chat.id,
        name: ctx.chat.title
      },
      songData
    );
  }
  await ctx.deleteMessage();
});

export default composer;
