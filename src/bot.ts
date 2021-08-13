/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

import { Telegraf } from 'telegraf';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import env from './env';

const bot = new Telegraf(env.BOT_TOKEN, {
    telegram: {
        webhookReply: false
    }
});
export const log = async (message: string, parse_mode: ExtraReplyMessage['parse_mode'] = 'HTML') => {
    if (!env.LOG_CHANNEL) {
        console.log(message);
        return;
    }
    return await bot.telegram.sendMessage(env.LOG_CHANNEL!, message, {
        parse_mode: parse_mode
    });
}

export default bot;