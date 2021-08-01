import { Composer } from 'telegraf';
import { TgCalls, playOrQueueSong } from '../tgcalls';
import { queue } from '../queue';

export const Pause = Composer.command(['pause', 'p'], async (ctx) => {
    if (ctx.chat.type === 'private') return await ctx.reply("This Command works on Group Only");
    if (!TgCalls.connected(ctx.chat.id)) return await ctx.reply("Inactive VC");

    await ctx.reply(TgCalls.pause(ctx.chat.id) ? 'Paused' : 'Not Playing')
});

export const Resume = Composer.command(['resume', 'r'], async (ctx) => {
    if (ctx.chat.type === 'private') return await ctx.reply("This Command works on Group Only");
    if (!TgCalls.connected(ctx.chat.id)) return await ctx.reply("Inactive VC");

    await ctx.reply(TgCalls.resume(ctx.chat.id) ? 'Resumed' : 'Not Paused')
});

export const Skip = Composer.command(['skip', 'next'], async (ctx) => {
    if (ctx.chat.type === 'private') return await ctx.reply("This Command works on Group Only");
    if (!TgCalls.connected(ctx.chat.id)) return await ctx.reply("Inactive VC");

    let next = queue.get(ctx.chat.id);
    if (next) {
        TgCalls.pause(ctx.chat.id);
        await playOrQueueSong({ id: ctx.chat.id, name: ctx.chat.title }, next, true);
        TgCalls.resume(ctx.chat.id);
        return
    }
    await TgCalls.stop(ctx.chat.id);
});

export const Stop = Composer.command('stopvc', async (ctx) => {
    if (ctx.chat.type === 'private') return await ctx.reply("This Command works on Group Only");
    if (!TgCalls.connected(ctx.chat.id)) return await ctx.reply("Inactive VC");

    queue.clear(ctx.chat.id);

    if (await TgCalls.stop(ctx.chat.id)) {
        return await ctx.reply('Stopped')
    }
});