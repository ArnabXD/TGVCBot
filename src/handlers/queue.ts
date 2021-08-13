/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

import { Composer } from 'telegraf';
import { queue } from '../queue';
import { escape } from 'html-escaper';

export const QueueList = Composer.command([`queue`, `q`], async (ctx) => {
    let data = queue.getAll(ctx.chat.id);
    if (!data || data.length === 0) return await ctx.replyWithHTML("Queue is empty");

    let text = `<b><i>Queue List : </i></b>\n\n`;
    data.forEach((d, i) => {
        text += `<b>${i + 1} :</b> <a href="${d.link}">${escape(d.title)}</a>\nRequested by : <a href="tg://user?id=${d.requestedBy.id}">${escape(d.requestedBy.first_name)}</a>\n\n`
    })
    return await ctx.replyWithHTML(text, { disable_web_page_preview: true })
})