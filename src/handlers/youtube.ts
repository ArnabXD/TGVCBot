import { Composer } from 'telegraf';
import { connections, queue } from '../tgcalls';
import { ffmpeg } from '../ffmpeg';
import { escape } from 'html-escaper';
import { commandExtractor, sendPlayingMessage, downloadSong } from '../utils';

export const Youtube = Composer.command('youtube', async (ctx) => {

    let { args: keyword } = commandExtractor(ctx.message.text)
    if (!keyword) return await ctx.reply("Provide Youtube Link/Search Keyword");

    await ctx.replyWithChatAction("typing");
    let result = await downloadSong(keyword);

    if (!result) return await ctx.reply('No Results Found');

    if (connections.playing(ctx.chat.id)) {
        const position = queue.push(ctx.chat.id, {
            ...result,
            requestedBy: {
                first_name: ctx.from.first_name,
                id: ctx.from.id
            }
        })
        return await ctx.replyWithHTML(`<a href="${result.link}">${result.title}</a> Queued at Postion ${position} by <a href="tg://user?id=${ctx.from.id}">${escape(ctx.from.first_name)}</a>`)
    } else {
        let FFMPEG = ffmpeg(result.mp3_link);
        if (!FFMPEG) return await ctx.reply("Something went wrong with FFMPEG");
        await connections.setReadable(ctx.chat.id, FFMPEG);
        return await sendPlayingMessage(ctx.chat.id, {
            ...result,
            requestedBy: {
                first_name: ctx.from.first_name,
                id: ctx.from.id
            }
        })
    }
})