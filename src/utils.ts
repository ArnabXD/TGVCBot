import { bot, log } from './bot';
import { QueueData } from './tgcalls';
import { escape } from 'html-escaper';
import qs from 'querystring';

type OmitX<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type PartialBy<T, K extends keyof T> = OmitX<T, K> & Partial<Pick<T, K>>

export const getPosterImageUrl = (image: string, title: string, artist: string = "@ArnabXD/TGVCBot") => {
    let query = qs.stringify({
        image,
        title: title.replace(/&quot;/g, `"`),
        artist,
        // x: Date.now()
    })
    console.log(`https://music-banner.herokuapp.com/banner?${query}`);
    return `https://music-banner.herokuapp.com/banner?${query}`;
}

export const sendPlayingMessage = async (chat: number, data: PartialBy<QueueData, 'readable'>) => {
    let text = `<b>Playing </b><a href="${data.link}">${data.title}</a>\nRequested by <a href="tg://user?id=${data.requestedBy.id}">${escape(data.requestedBy.first_name)}</a>`
    try {
        await bot.telegram.sendPhoto(chat, getPosterImageUrl(data.image, data.title, data.artist), {
            caption: text,
            parse_mode: 'HTML'
        });
    } catch (err) {
        await bot.telegram.sendMessage(chat, text, { parse_mode: 'HTML' });
        await log(escape(String(err)));
    }
}

export const commandExtractor = (text: string) => {
    let parts = /^\/([^@\s]+)@?(?:(\S+)|)\s?([\s\S]+)?$/i.exec(text.trim());
    return {
        text: text,
        command: parts ? parts[1] : null,
        bot: parts ? parts[2] : null,
        args: parts ? parts[3] : null
    }
}