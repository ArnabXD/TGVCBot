import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
// @ts-ignore
import input from 'input';
import dotenv from 'dotenv';

dotenv.config();

const apiId = Number(process.env.API_ID);
const apiHash = String(process.env.API_HASH);
const stringSession = new StringSession('');

(async () => {
    console.log('Loading interactive example...');
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });
    await client.start({
        phoneNumber: async () => await input.text('number ?'),
        password: async () => await input.text('password?'),
        phoneCode: async () => await input.text('Code ?'),
        onError: err => console.log(err),
    });
    console.log('You should now be connected.');
    const savedSession = client.session.save()
    console.log(`[Session] - ${savedSession}`);
    await client.sendMessage('me', {
        message: `<b>TGVCBot Session</b> - Don't Share with anyone\n\n<code>${savedSession}</code>`,
        parseMode: 'HTML'
    });
})();