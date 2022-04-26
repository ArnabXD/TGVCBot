/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Bot } from 'grammy';
import { ParseMode } from '@grammyjs/types';
import env from './env';

const bot = new Bot(env.BOT_TOKEN, {
  client: { canUseWebhookReply: () => false }
});

export const log = async (message: string, parse_mode: ParseMode = 'HTML') => {
  if (!env.LOG_CHANNEL) {
    console.log(message);
    return;
  }
  return await bot.api.sendMessage(env.LOG_CHANNEL, message, {
    parse_mode
  });
};

export default bot;
