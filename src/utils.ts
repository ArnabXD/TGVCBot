import { bot } from './bot';
import { QueueData } from './tgcalls';
import { escape } from 'html-escaper';

export const sendPlayingMessage = async (chat: number, data: QueueData) => {
    let text = `<b>Playing </b><a href="${data.link}">${escape(data.title)}</a>\nRequested by <a href="tg://user?id=${data.requestedBy.id}">${escape(data.requestedBy.first_name)}</a>`
    await bot.telegram.sendMessage(chat, text, { parse_mode: 'HTML' });
}