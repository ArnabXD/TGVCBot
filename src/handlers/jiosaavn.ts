import { Composer } from 'telegraf';
import fetch from 'node-fetch';
import { connections, queue } from '../tgcalls';
import { ffmpeg } from '../ffmpeg';
import { escape } from 'html-escaper';
import { JioSaavnSongResponse, JioSaavnSongSearchResponse } from '../types/responseTypes';

export const JioSaavn = Composer.command('jiosaavn', async (ctx) => {

    let keyword = ctx.message.text.replace(/\/jiosaavn(@[a-zA-Z0-9\-_]+)?\s/, '').replace(/\s/g, "+");
    if (keyword === "/jiosaavn") return await ctx.reply("Die You Retard")
    await ctx.replyWithChatAction("typing");

    let [result]: JioSaavnSongSearchResponse[] = await (await fetch(`https://jiosaavn-api.vercel.app/search?query=${keyword}`)).json()
    if (!result) return await ctx.reply("No Results Found")

    let song: JioSaavnSongResponse = await (await fetch(`https://jiosaavn-api.vercel.app/song?id=${result.id}`)).json();

    let FFMPEG = ffmpeg(song.other_qualities.pop()?.url ?? song.media_url)
    if (!FFMPEG) return await ctx.reply("Something went wrong with FFMPEG")

    if (connections.playing(ctx.chat.id)) {
        const position = queue.add(ctx.chat.id, {
            link: song.perma_url,
            title: song.song,
            requestedBy: {
                id: ctx.from.id,
                first_name: ctx.from.first_name
            },
            readable: FFMPEG
        })
        return await ctx.replyWithHTML(`<a href="${song.perma_url}">${song.song}</a> Queued at Postion ${position} by ${escape(ctx.from.first_name)}`)
    } else {
        await connections.setReadable(ctx.chat.id, FFMPEG);
        return await ctx.replyWithHTML(`Playing <a href="${song.perma_url}">${song.song}</a>`)
    }
})