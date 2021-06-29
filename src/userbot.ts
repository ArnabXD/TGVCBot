import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from 'telegram/extensions/Logger';
import env from './env';

const { API_ID, API_HASH, SESSION, LOG_CHANNEL } = env;
const session = new StringSession(SESSION)
Logger.setLevel("none")

export const client = new TelegramClient(session, API_ID, API_HASH!, {
    connectionRetries: 3,
})

export const startUserBot = async (): Promise<void> => {
    await client.start({
        phoneNumber: "",
        phoneCode: async () => "",
        password: async () => "",
        onError: async () => false
    })
    await client.sendMessage(LOG_CHANNEL, {
        message: "Userbot is Running"
    })
}
