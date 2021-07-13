import { bot, log } from './bot';
import { QueueData } from './tgcalls';
import { escape } from 'html-escaper';
import qs from 'querystring';

type OmitX<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type PartialBy<T, K extends keyof T> = OmitX<T, K> & Partial<Pick<T, K>>

export const getPosterImageUrl = (image: string, title: string, artist: string = "@ArnabXD/TGVCBot") => {
    let query = qs.stringify({
        image,
        title: title,
        artist,
        // x: Date.now()
    })
    return `https://music-banner.herokuapp.com/banner?${query}`;
}

export const sendPlayingMessage = async (chat: number, data: PartialBy<QueueData, 'mp3_link'>) => {
    let text =
        `<b>Playing </b><a href="${data.link}">${data.title}</a>\n` +
        `&#10151; Duration : ${hhmmss(data.duration)}\n` +
        `&#10151; Requested by <a href="tg://user?id=${data.requestedBy.id}">${escape(data.requestedBy.first_name)}</a>`;
    try {
        await bot.telegram.sendPhoto(chat, getPosterImageUrl(data.image, data.title, data.artist), {
            caption: text,
            parse_mode: 'HTML'
        });
        console.log(`[TGVCBot][CHAT:${chat}] Started Playing - ${data.title}`);
    } catch (err) {
        await bot.telegram.sendMessage(chat, text, { parse_mode: 'HTML' });
        await log(escape(String(err)));
    }
}

export const sendErrorMessage = async (chat: number, message: string) => {
    return await bot.telegram.sendMessage(chat, `<b>Error :</b>\n${message}`);
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

export const hhmmss = (duration: string): string => {
    let sec = parseInt(duration, 10)
    let hms = (new Date(1000 * sec)).toISOString().substr(11, 8).split(":");
    let str = ``;
    (hms[0] !== "00") ? (str += `${parseInt(hms[0], 10)}h `) : (str += ``);
    (hms[1] !== "00") ? (str += `${parseInt(hms[1], 10)}m `) : (str += ``);
    (hms[2] !== "00") ? (str += `${parseInt(hms[2], 10)}s`) : (str += ``);
    return str;
}