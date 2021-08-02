import { Composer } from "telegraf";
import axios from 'axios';
import { stringify } from 'querystring';
import { commandExtractor } from '../utils';
import { JioSaavnSongResponse, JioSaavnSongSearchResponse } from '../types/jiosaavn.response';
import { playOrQueueSong } from '../tgcalls';

export const JioSaavnPlay = Composer.command(['jiosaavn', 'jsvn'], async (ctx) => {
    
    await ctx.telegram.sendChatAction(ctx.chat.id, "typing");

    if (ctx.chat.type === 'private') return await ctx.reply("This Command works on Group Only");

    let { args: keyword } = commandExtractor(ctx.message.text);
    if (!keyword) return await ctx.reply("Please Provide Search Keyword")

    let query = stringify({ query: keyword.replace(/\s/g, '+') });
    let resp = (await axios.get<JioSaavnSongSearchResponse[]>(`https://jiosaavn-api.vercel.app/search?${query}`)).data;

    if (!resp[0]) return await ctx.reply("No Results Found");

    let [result] = resp;
    let song = (await axios.get<JioSaavnSongResponse>(`https://jiosaavn-api.vercel.app/song?id=${result.id}`)).data;

    await playOrQueueSong(
        { id: ctx.chat.id, name: ctx.chat.title },
        {
            link: song.perma_url,
            title: song.song.replace(/&quot;/g, `"`),
            image: song.image,
            artist: song.singers,
            duration: song.duration,
            requestedBy: {
                id: ctx.from.id,
                first_name: ctx.from.first_name
            },
            mp3_link: song.other_qualities.pop()?.url ?? song.media_url,
            provider: 'jiosaavn'
        }
    )

})