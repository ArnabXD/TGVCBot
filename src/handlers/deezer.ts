import { Composer } from 'telegraf';
import fetch from 'node-fetch';
import { connections, queue } from '../tgcalls';
import { ffmpeg } from '../ffmpeg';
import { escape } from 'html-escaper';
import { DeezerResponse } from '../types/responseTypes';
import { commandExtractor } from '../utils';

export const Deezer = Composer.command('deezer', async (ctx) => {

    let { args: keyword } = commandExtractor(ctx.message.text)
    if (!keyword) return await ctx.reply("Die You Retard")

    await ctx.replyWithChatAction("typing");

    let [result]: DeezerResponse[] = await (await fetch(`http://jostapi.herokuapp.com/deezer?query=${keyword.replace(/\s/g, '%20')}&quality=mp3&limit=1`)).json()
    if (!result) return await ctx.reply("No Results Found")

    let FFMPEG = ffmpeg(result.raw_link)
    if (!FFMPEG) return await ctx.reply("Something went wrong with FFMPEG")

    if (connections.playing(ctx.chat.id)) {
        const position = queue.add(ctx.chat.id, {
            link: result.link,
            title: result.title,
            requestedBy: {
                id: ctx.from.id,
                first_name: ctx.from.first_name
            },
            readable: FFMPEG
        })
        return await ctx.replyWithHTML(`<a href="${result.link}">${result.title}</a> Queued at Postion ${position} by <a href="tg://user?id=${ctx.from.id}">${escape(ctx.from.first_name)}</a>`)
    } else {
        await connections.setReadable(ctx.chat.id, FFMPEG);
        return await ctx.replyWithHTML(`Playing <a href="${result.link}">${result.title}</a>`)
    }
})