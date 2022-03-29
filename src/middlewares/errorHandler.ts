/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { ErrorHandler } from 'grammy';
import { escape } from 'html-escaper';
import { log } from '../bot';

export const errorHandler: ErrorHandler = async (err) => {
  if (err) {
    try {
      const msg =
        err.message + `\n<code>${escape(JSON.stringify(err, null, 2))}</code>`;
      if (err.message.match("'sendChatAction' failed!")) {
        await err.ctx.leaveChat();
        await log(msg, 'HTML');
        return;
      }
      await log(msg, 'HTML');
      await err.ctx.reply(msg, { parse_mode: 'HTML' });
    } catch (e) {
      console.error(e);
    }
  }
};
