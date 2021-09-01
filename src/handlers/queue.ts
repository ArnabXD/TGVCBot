/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Composer } from 'grammy';
import { queue } from '../queue';
import { escape } from 'html-escaper';
import { commandExtractor } from '../utils';

const composer = new Composer();

export default composer;

composer.command([`queue`, `q`], async (ctx) => {
  let data = queue.getAll(ctx.chat.id);
  if (!data || data.length === 0)
    return await ctx.reply('Queue is empty', { parse_mode: 'HTML' });

  let text = `<b><i>Queue List : </i></b>\n\n`;
  data.forEach((d, i) => {
    text += `<b>${i + 1} :</b> <a href="${d.link}">${escape(
      d.title
    )}</a>\nRequested by : <a href="tg://user?id=${d.requestedBy.id}">${escape(
      d.requestedBy.first_name
    )}</a>\n\n`;
  });
  return await ctx.reply(text, {
    disable_web_page_preview: true,
    parse_mode: 'HTML'
  });
});

composer.command(['delete', 'remove', 'd'], async (ctx) => {
  let text = commandExtractor(ctx.message?.text!);

  if (!text.args || !parseInt(text.args, 10)) {
    return await ctx.reply('Command Example :\n/del 2');
  }

  let position = parseInt(text.args, 10);
  let data = queue.delete(ctx.chat.id, position);

  if (!data) return await ctx.reply('Invalid queue position');
  return await ctx.reply(
    'Deleted <a href="' +
      data[0].link +
      '">' +
      data[0].title +
      '</a> from queue',
    {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }
  );
});
