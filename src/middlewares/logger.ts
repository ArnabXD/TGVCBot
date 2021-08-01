import { Context, MiddlewareFn } from 'telegraf';
import { log } from '../bot';
import { escape } from 'html-escaper';

export const Logger: MiddlewareFn<Context> = async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        console.log(err);
        await ctx.replyWithHTML(`<b>Error :</b>\n <code>${escape(String(err))}</code>`);
        await log(`<b>Error :</b>\n <code>${escape(String(err))}</code>`);
    }
}