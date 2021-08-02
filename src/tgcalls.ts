import { GramTGCalls } from 'gram-tgcalls';
import { userbot } from './userbot';
import bot, { log } from './bot';
import { Chat } from './types/chat';
import { queue, QueueData } from './queue';
import { escape } from 'html-escaper';
import { ffmpeg } from './ffmpeg';
import { sendPlayingMessage } from './utils';
import ytdl from 'ytdl-core-telegram';

export const TgCalls = new GramTGCalls(userbot);

const streamParams = {
    bitsPerSample: 16,
    sampleRate: 65000,
    channelCount: 1
}

export const onFinish = async (chat: Chat) => {
    let next = queue.get(chat.id);
    if (next) return playOrQueueSong(chat, next);
    await TgCalls.stop(chat.id);
}

export const playOrQueueSong = async (chat: Chat, data: QueueData, force: boolean = false) => {

    if (TgCalls.connected(chat.id) && !TgCalls.finished(chat.id) && !force) {
        let position = queue.push(chat.id, data);
        return await bot.telegram.sendMessage(
            chat.id,
            `<a href="${data.link}">${escape(data.title)}</a> Queued at Postion ${position} by <a href="tg://user?id=${data.requestedBy.id}">${escape(data.requestedBy.first_name)}</a>`,
            {
                disable_web_page_preview: true,
                parse_mode: 'HTML'
            }
        )
    }

    if (data.provider === 'jiosaavn') {
        let FFMPEG = ffmpeg(data.mp3_link);
        await TgCalls.stream(chat.id, FFMPEG, {
            onFinish: () => onFinish(chat),
            stream: streamParams
        });
        await sendPlayingMessage(chat, data);
    }

    if (data.provider === 'youtube') {
        let readable = ytdl.downloadFromInfo(await ytdl.getInfo(data.link), { quality: 'highestaudio', filter: 'audioonly' })
        await TgCalls.stream(chat.id, readable, {
            onFinish: () => onFinish(chat),
            stream: streamParams
        });
        await sendPlayingMessage(chat, data);
    }
}