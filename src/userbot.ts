/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from 'telegram/extensions';
import env from './env';

Logger.setLevel('none');

export const userbot = new TelegramClient(
    new StringSession(env.SESSION),
    env.API_ID,
    env.API_HASH,
    { connectionRetries: 5 },
);

export const startUserBot = async () => {
    await userbot.start({ botAuthToken: '' });
    await userbot.sendMessage(env.LOG_CHANNEL, { message: 'UserBot is Running' });
}