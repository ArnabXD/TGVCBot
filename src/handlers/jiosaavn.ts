import { Composer } from 'telegraf';
import fetch from 'node-fetch';
import { connections, queue } from '../tgcalls';
import { ffmpeg } from '../ffmpeg';
import { escape } from 'html-escaper';
import { JioSaavnSongResponse, JioSaavnSongSearchResponse } from '../types/responseTypes';
import { commandExtractor } from '../utils';

export const JioSaavn = Composer.command('jiosaavn', async (ctx) => {

    let { args: keyword } = commandExtractor(ctx.message.text)
    if (!keyword) return await ctx.reply("Die You Retard")

    await ctx.replyWithChatAction("typing");

    let resp: JioSaavnSongSearchResponse[] = await (await fetch(`https://jiosaavn-api.vercel.app/search?query=${keyword.replace(/\s/g, '+')}`)).json()
    if (!resp[0]) return await ctx.reply("No Results Found")

    let [result] = resp

    let song: JioSaavnSongResponse = await (await fetch(`https://jiosaavn-api.vercel.app/song?id=${result.id}`)).json();

    let FFMPEG = ffmpeg(song.other_qualities.pop()?.url ?? song.media_url)
    if (!FFMPEG) return await ctx.reply("Something went wrong with FFMPEG")

    if (connections.playing(ctx.chat.id)) {
        const position = queue.add(ctx.chat.id, {
            link: song.perma_url,
            title: song.song,
            image: song.image,
            artist: song.singers,
            requestedBy: {
                id: ctx.from.id,
                first_name: ctx.from.first_name
            },
            readable: FFMPEG
        })
        return await ctx.replyWithHTML(`<a href="${song.perma_url}">${song.song}</a> Queued at Postion ${position} by <a href="tg://user?id=${ctx.from.id}">${escape(ctx.from.first_name)}</a>`)
    } else {
        await connections.setReadable(ctx.chat.id, FFMPEG);
        return await ctx.replyWithPhoto(`https://music-banner.herokuapp.com/banner?image=${song.image}&title=${song.song}&artist=${song.singers}`, {
            caption: `Playing <a href="${song.perma_url}">${song.song}</a>`,
            parse_mode: 'HTML'
        })
    }
})