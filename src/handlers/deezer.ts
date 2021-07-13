import { Composer } from 'telegraf';
import fetch from 'node-fetch';
import { connections, queue } from '../tgcalls';
import { ffmpeg } from '../ffmpeg';
import { escape } from 'html-escaper';
import { DeezerResponse } from '../types/responseTypes';
import { commandExtractor, sendPlayingMessage } from '../utils';
import { stringify } from 'querystring';

export const Deezer = Composer.command('deezer', async (ctx) => {

    let { args: keyword } = commandExtractor(ctx.message.text)
    if (!keyword) return await ctx.reply("Die You Retard");
    let query = stringify({
        query: keyword,
        quality: "mp3",
        limit: 1
    })

    await ctx.replyWithChatAction("typing");

    let resp: DeezerResponse[] = await (await fetch(`https://jostapi-production.up.railway.app/deezer?${query}`)).json()
    if (!resp || resp.length === 0) return await ctx.reply("No Results Found");

    let [result] = resp;

    if (connections.playing(ctx.chat.id)) {
        const position = queue.push(ctx.chat.id, {
            link: result.link,
            title: result.title,
            image: result.album.cover_big,
            artist: result.artist.name,
            requestedBy: {
                id: ctx.from.id,
                first_name: ctx.from.first_name
            },
            duration: `${result.duration}`,
            mp3_link: result.raw_link
        })
        return await ctx.replyWithHTML(`<a href="${result.link}">${result.title}</a> Queued at Postion ${position} by <a href="tg://user?id=${ctx.from.id}">${escape(ctx.from.first_name)}</a>`)
    } else {
        let FFMPEG = ffmpeg(result.raw_link);
        if (!FFMPEG) return await ctx.reply("Something went wrong with FFMPEG");
        await connections.setReadable(ctx.chat.id, FFMPEG);
        return await sendPlayingMessage(ctx.chat.id, {
            link: result.link,
            title: result.title,
            image: result.album.cover_big,
            artist: result.artist.name,
            duration: `${result.duration}`,
            requestedBy: {
                id: ctx.from.id,
                first_name: ctx.from.first_name
            }
        })
    }
})