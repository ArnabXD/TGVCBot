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