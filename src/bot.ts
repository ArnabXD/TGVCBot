import { Telegraf } from 'telegraf';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import env from './env';

const bot = new Telegraf(env.BOT_TOKEN);
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