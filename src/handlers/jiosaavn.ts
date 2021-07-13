import { Composer } from 'telegraf';
import fetch from 'node-fetch';
import { connections, queue } from '../tgcalls';
import { ffmpeg } from '../ffmpeg';
import { escape } from 'html-escaper';
import { JioSaavnSongResponse, JioSaavnSongSearchResponse } from '../types/responseTypes';
import { commandExtractor, sendPlayingMessage } from '../utils';
import { stringify } from 'querystring';

export const JioSaavn = Composer.command('jiosaavn', async (ctx) => {

    let { args: keyword } = commandExtractor(ctx.message.text);
    if (!keyword) return await ctx.reply("Die You Retard")
    let query = stringify({ query: keyword.replace(/\s/g, '+') })

    await ctx.replyWithChatAction("typing");

    let resp: JioSaavnSongSearchResponse[] = await (await fetch(`https://jiosaavn-api.vercel.app/search?${query}`)).json()
    if (!resp[0]) return await ctx.reply("No Results Found")

    let [result] = resp;

    let song: JioSaavnSongResponse = await (await fetch(`https://jiosaavn-api.vercel.app/song?id=${result.id}`)).json();

    if (connections.playing(ctx.chat.id)) {
        const position = queue.push(ctx.chat.id, {
            link: song.perma_url,
            title: song.song.replace(/&quot;/g, `"`),
            image: song.image,
            artist: song.singers,
            duration: song.duration,
            requestedBy: {
                id: ctx.from.id,
                first_name: ctx.from.first_name
            },
            mp3_link: song.other_qualities.pop()?.url ?? song.media_url
        })
        return await ctx.replyWithHTML(`<a href="${song.perma_url}">${song.song}</a> Queued at Postion ${position} by <a href="tg://user?id=${ctx.from.id}">${escape(ctx.from.first_name)}</a>`)
    } else {
        let FFMPEG = ffmpeg(song.other_qualities.pop()?.url ?? song.media_url);
        if (!FFMPEG) return await ctx.reply("Something went wrong with FFMPEG");
        await connections.setReadable(ctx.chat.id, FFMPEG);
        return await sendPlayingMessage(ctx.chat.id, {
            link: song.perma_url,
            title: song.song.replace(/&quot;/g, `"`),
            image: song.image,
            artist: song.singers,
            duration: song.duration,
            requestedBy: {
                id: ctx.from.id,
                first_name: ctx.from.first_name
            }
        })
    }
})