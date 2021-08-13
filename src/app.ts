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

(async () => {
    InitMiddleWares();
    InitHandlers();
    await bot.launch({
        dropPendingUpdates: true,
        allowedUpdates: ["message", "callback_query"]
    })
    await log("Bot is Running");
    await startUserBot();
})();

process.once('SIGINT', async () => {
    bot.stop('SIGINT');
})