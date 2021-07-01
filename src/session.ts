import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from 'telegram/extensions/Logger';
// @ts-ignore
import input from 'input';
import dotenv from 'dotenv';

dotenv.config();

Logger.setLevel("none");

const apiId = Number(process.env.API_ID);
const apiHash = String(process.env.API_HASH);
const stringSession = new StringSession('');

(async () => {
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });
    await client.start({
        phoneNumber: async () => await input.text('Phone Number =>'),
        password: async () => await input.text('Password =>'),
        phoneCode: async () => await input.text('Code =>'),
        onError: err => console.log(err),
    });
    const savedSession = client.session.save()
    console.log(`[Session] - ${savedSession}`);
    await client.sendMessage('me', {
        message: `<b>TGVCBot Session</b> - Don't Share with anyone\n\n<code>${savedSession}</code>`,
        parseMode: 'HTML'
    });
    process.exit(1);
})();