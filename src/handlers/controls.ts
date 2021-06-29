import { Composer } from 'telegraf';
import { connections } from '../tgcalls';

export const Pause = Composer.command('pause', async (ctx) => {
    switch (connections.pause(ctx.chat.id)) {
        case 0:
            return await ctx.reply(`Paused`);
        case 1:
            return await ctx.reply(`Already paused`);
        case 2:
            return await ctx.reply(`Inactive voice chat`);
    }
});

export const Resume = Composer.command(`resume`, async (ctx) => {
    switch (connections.resume(ctx.chat.id)) {
        case 0:
            return await ctx.reply(`Resumed`);
        case 1:
            return await ctx.reply(`Already playing`);
        case 2:
            return await ctx.reply(`Inactive voice chat`);
    }
})

export const Skip = Composer.command('skip', async (ctx) => {
    switch (await connections.skip(ctx.chat.id)) {
        case 0:
            return await ctx.reply(`Skipped`);
        case 1:
            return await ctx.reply(`Can't Skip`);
        case 2:
            return await ctx.reply(`Inactive voice chat`);
    }
})