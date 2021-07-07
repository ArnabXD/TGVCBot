import { bot } from './bot';
import { QueueData } from './tgcalls';
import { escape } from 'html-escaper';

export const sendPlayingMessage = async (chat: number, data: QueueData) => {
    let text = `<b>Playing </b><a href="${data.link}">${escape(data.title)}</a>\nRequested by <a href="tg://user?id=${data.requestedBy.id}">${escape(data.requestedBy.first_name)}</a>`
    await bot.telegram.sendPhoto(chat, `http://music-banner.herokuapp.com/banner?image=${data.image}&title=${data.title}&artist=${data.artist}`, {
        caption: text,
        parse_mode: 'HTML'
    });
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