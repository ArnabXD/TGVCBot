import { Context, MiddlewareFn } from 'telegraf';
import { log } from '../bot';
import { escape } from 'html-escaper';

export const ErrorHandler: MiddlewareFn<Context> = async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        let error = String(err);
        if (error.includes("Could not find the input entity") || error.includes("Cannot cast InputPeerChat")) {
            await ctx.reply("My VC User is unable to join the Voice Chat here, So can't play anything. Bye Bye");
            return await ctx.leaveChat();
        }
        await ctx.replyWithHTML(`<code>${escape(String(err))}</code>`);
        await log(`<b>Error :</b>\n <code>${escape(String(err))}</code>`);
    }
}