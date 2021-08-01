import bot, { log } from "./bot";
import { stringify } from "querystring";
import { Chat } from './types/chat';
import { QueueData } from './queue';
import { escape } from "html-escaper";

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

export const getPosterImageUrl = (image: string, title: string, artist: string = "@ArnabXD/TGVCBot") => {
    let query = stringify({
        image,
        title: (title.length > 55) ? title.slice(0, 52) + "..." : title,
        artist: (artist.length > 45) ? artist.slice(0, 42) + "..." : artist,
        // x: Date.now()
    })
    return `https://music-banner.herokuapp.com/banner?${query}`;
}

export const sendPlayingMessage = async (chat: Chat, data: QueueData) => {
    let text =
        `Playing <a href="${data.link}">${data.title}</a>\n` +
        `<b>&#10143;</b> Duration : ${hhmmss(data.duration)}\n` +
        `<b>&#10143;</b> Requested by <a href="tg://user?id=${data.requestedBy.id}">${escape(data.requestedBy.first_name)}</a>`;
    try {
        await bot.telegram.sendPhoto(chat.id, getPosterImageUrl(data.image, data.title, data.artist), {
            caption: text,
            parse_mode: 'HTML'
        });
        console.log(`[TGVCBot][${chat.name}] Playing - ${data.title}`);
    } catch (err) {
        await bot.telegram.sendMessage(chat.id, text, { parse_mode: 'HTML' });
        await log(escape(String(err)));
    }
}