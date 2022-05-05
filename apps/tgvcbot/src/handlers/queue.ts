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

const composer = new Composer();

composer.command([`queue`, `q`], async (ctx) => {
  const data = await queue.getAll(ctx.chat.id);
  if (!data || !data.length) {
    await ctx.reply('Queue is empty', { parse_mode: 'HTML' });
    return;
  }
  let text = `<b><i>Queue List : </i></b>\n\n`;
  data.forEach((d, i) => {
    text += `<b>${i + 1} :</b> <a href="${d.link}">${escape(
      d.title
    )}</a>\nRequested by : <a href="tg://user?id=${d.req_by_id}">${escape(
      d.req_by_fname
    )}</a>\n\n`;
  });
  await ctx.reply(text, {
    disable_web_page_preview: true,
    parse_mode: 'HTML'
  });
});

// composer.command(['delete', 'remove', 'd'], async (ctx) => {
//   const text = ctx.match;
//   if (!text || !parseInt(text, 10)) {
//     await ctx.reply('Command Example :\n/del 2');
//     return;
//   }
//   const position = parseInt(text, 10);
//   const data = await queue.delete(ctx.chat.id, position);
//   if (!data) {
//     await ctx.reply('Invalid queue position');
//     return;
//   }
//   await ctx.reply(
//     'Deleted <a href="' + data.link + '">' + data.title + '</a> from queue',
//     {
//       parse_mode: 'HTML',
//       disable_web_page_preview: true
//     }
//   );
// });

export default composer;
