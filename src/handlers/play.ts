import { Composer } from 'telegraf';
import { playOrQueueSong } from '../tgcalls';
import { getMessageLink } from '../utils';

export const Play = Composer.command(['play', 'pl'], async ctx => {
    if (ctx.chat.type === 'private') return await ctx.reply("This Command works on Group Only");

    if (
        !ctx.message.reply_to_message ||
        !('audio' in ctx.message.reply_to_message)
    ) return await ctx.reply("Please reply this command to a audio file");

    let { reply_to_message: message } = ctx.message
    let { href: mp3_link } = await ctx.telegram.getFileLink(message.audio.file_id);

    let poster = `https://telegra.ph/file/6b07279fd80ef2b844ed0.png`;
    if (message.audio.thumb) {
        poster = (await ctx.telegram.getFileLink(message.audio.thumb.file_id)).href
    }

    await playOrQueueSong(
        { id: ctx.chat.id, name: ctx.chat.title },
        {
            title: message.audio.title!,
            duration: message.audio.duration.toString(),
            image: poster,
            artist: message.audio.performer ?? "TGVCBot",
            link: getMessageLink(ctx.chat.id, message.message_id),
            mp3_link,
            provider: 'telegram',
            requestedBy: {
                first_name: ctx.from.first_name,
                id: ctx.from.id
            }
        }
    )

})