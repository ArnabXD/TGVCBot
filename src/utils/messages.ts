import bot, { log } from '../bot';
import { hhmmss } from './hhmmss';
import { Chat } from '../types/chat';
import { escape } from 'html-escaper';
import { QueueData } from '../queue';
import { InputFile } from 'grammy';
import { generateBanner } from './banner';

export const sendPlayingMessage = async (chat: Chat, data: QueueData) => {
  const text =
    `Playing <a href="${data.link}">${data.title}</a>\n` +
    `<b>&#10143;</b> Duration : ${hhmmss(data.duration)}\n` +
    `<b>&#10143;</b> Requested by <a href="tg://user?id=${
      data.requestedBy.id
    }">${escape(data.requestedBy.first_name)}</a>`;
  try {
    const banner = await generateBanner({
      image: data.image,
      artist: data.artist,
      title: data.title
    });
    await bot.api.sendPhoto(chat.id, new InputFile(banner, 'thumbnail.png'), {
      caption: text,
      parse_mode: 'HTML'
    });
    console.log(`[TGVCBot][${chat.name}] Playing - ${data.title}`);
  } catch (err) {
    await bot.api.sendMessage(chat.id, text, { parse_mode: 'HTML' });
    await log(escape(String(err)));
  }
};

export const sendFailedToStreamMessage = async (chat: number, error: Error) => {
  bot.api.sendMessage(
    chat,
    'Failed to stream the song\n`' + error.message + '`',
    { parse_mode: 'MarkdownV2' }
  );
};

export const getMessageLink = (chat: number, message_id: number) => {
  const chat_id = chat.toString();
  return `https://t.me/c/${chat_id.slice(
    chat_id.startsWith('-100') ? 4 : 1
  )}/${message_id}`;
};

export const getDownloadLink = async (id: string) =>
  `https://api.telegram.org/file/bot${bot.token}/${
    (await bot.api.getFile(id)).file_path
  }`;
