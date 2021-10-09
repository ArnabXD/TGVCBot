/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import bot, { log } from './bot';
import { startUserBot } from './userbot';
import { InitMiddleWares } from './middlewares';
import { InitHandlers } from './handlers';
import { TestFFMPEG } from './ffmpeg';

(async () => {
  TestFFMPEG(); // Check if FFMPEG is installed or not

  InitMiddleWares();
  InitHandlers();

  await startUserBot();
  await log('Bot is Running');
  await bot.start({
    drop_pending_updates: true,
    allowed_updates: ['message', 'callback_query']
  });
})();
