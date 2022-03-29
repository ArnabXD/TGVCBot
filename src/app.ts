/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import bot, { log } from './bot';
import { startUserBot } from './userbot';
import { InitHandlers } from './handlers';
import { TestFFMPEG } from './ffmpeg';
import { escape } from 'html-escaper';

(async () => {
  TestFFMPEG(); // Check if FFMPEG is installed or not
  InitHandlers();
  await startUserBot();

  bot.catch(async (err) => {
    if (err) {
      const msg =
        err.message + `\n<code>${escape(JSON.stringify(err, null, 2))}</code>`;
      if (err.message.match("'sendChatAction' failed!")) {
        await err.ctx.leaveChat();
        await log(msg, 'HTML');
        return;
      }
      await log(msg, 'HTML');
      await err.ctx.reply(msg, { parse_mode: 'HTML' });
    }
  });

  await log('Bot is Running');
  await bot.start({
    drop_pending_updates: true,
    allowed_updates: ['message', 'callback_query']
  });
})();
