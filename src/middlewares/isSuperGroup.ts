import { MiddlewareFn, Context } from 'telegraf';
import env from '../env';

export const isSuperGroup: MiddlewareFn<Context> = async (ctx, next) => {
    if (ctx.chat?.type === "supergroup" || ctx.chat?.id === env.LOG_CHANNEL || ctx.chat?.type === "private") {
        await next();
    } else {
        await ctx.reply("I am supposed to work only in Supergroups, Bye Bye..");
        await ctx.leaveChat();
    }
}