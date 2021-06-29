import { Context, MiddlewareFn } from 'telegraf';
import { log } from '../bot';
import { escape } from 'html-escaper';

export const Logger: MiddlewareFn<Context> = async (_, next) => {
    try {
        await next();
    } catch (err) {
        await log(`<b>Error :</b>\n <code>${escape(String(err))}</code>`);
    }
}
