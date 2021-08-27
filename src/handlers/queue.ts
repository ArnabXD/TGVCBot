/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Composer } from "grammy";
import { queue } from "../queue";
import { escape } from "html-escaper";

const composer = new Composer();

export default composer;

composer.command([`queue`, `q`], (ctx) => {
  let data = queue.getAll(ctx.chat.id);
  if (!data || data.length === 0)
    return ctx.reply("Queue is empty", { parse_mode: "HTML" });

  let text = `<b><i>Queue List : </i></b>\n\n`;
  data.forEach((d, i) => {
    text += `<b>${i + 1} :</b> <a href="${d.link}">${escape(
      d.title
    )}</a>\nRequested by : <a href="tg://user?id=${d.requestedBy.id}">${escape(
      d.requestedBy.first_name
    )}</a>\n\n`;
  });
  return ctx.reply(text, {
    disable_web_page_preview: true,
    parse_mode: "HTML",
  });
});
