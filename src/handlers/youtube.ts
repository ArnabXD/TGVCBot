import { Composer } from 'telegraf';
import { commandExtractor } from '../utils';
import ytsearch from 'yt-search';
import { playOrQueueSong } from '../tgcalls';

export const YTPlay = Composer.command(['youtube', 'yt'], async (ctx) => {

    await ctx.telegram.sendChatAction(ctx.chat.id, "typing");
    
    if (ctx.chat.type === 'private') return await ctx.reply("This Command works on Group Only");

    let { args: query } = commandExtractor(ctx.message.text);
    if (!query) return await ctx.reply("Please Provide Search Keyword/Youtube Link");

    const { videos } = await ytsearch.search({ query, pages: 1 })
    if (!videos || videos.length < 1) return await ctx.reply("No Results Found")

    let [video] = videos;
    await playOrQueueSong(
        { id: ctx.chat.id, name: ctx.chat.title },
        {
            title: video.title,
            link: video.url,
            image: video.image,
            duration: `${video.duration.seconds}`,
            artist: video.author.name,
            requestedBy: {
                id: ctx.from.id,
                first_name: ctx.from.first_name
            },
            mp3_link: video.url,
            provider: 'youtube'
        }
    )
})