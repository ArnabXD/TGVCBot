import { TGCalls, Stream } from 'tgcalls';
import { joinCall, leaveCall } from '../calls';
import { Readable } from 'stream';
import { queue } from './queue';
import { sendPlayingMessage } from '../utils';

export class Player {
    chatId: number;
    tgcalls: TGCalls<{ chatId: number }>;
    playing: boolean;
    stream?: Stream;
    close: () => void;

    constructor(chatId: number, close: () => void) {
        this.chatId = chatId;
        this.close = close;
        queue.init(chatId);
        this.tgcalls = new TGCalls({ chatId });
        this.tgcalls.joinVoiceCall = async (payload) => await joinCall(chatId, payload);
        this.playing = false;
    }

    async finish() {
        this.playing = false;
        let next = queue.get(this.chatId);
        if (next) {
            this.setReadable(next.readable);
            await sendPlayingMessage(this.chatId, next);
        } else {
            queue.clear(this.chatId);
            await leaveCall(this.chatId);
            this.close();
        }
    }

    setReadable(readable: Readable) {
        this.stream?.setReadable(readable);
        this.playing = true;
    }

    async play(readable: Readable) {
        this.stream = new Stream(readable, 16, 48000, 1);
        this.stream.on('finish', async () => await this.finish())
        await this.tgcalls.start(this.stream.createTrack());
        this.playing = true;
    }

    pause() {
        if (queue.getAll(this.chatId) && !this.stream?.paused) {
            this.stream?.pause();
            this.playing = false;
            return true;
        }
        return false;
    }

    resume() {
        if (queue.getAll(this.chatId) && this.stream?.paused) {
            this.stream.pause();
            this.playing = true;
            return true;
        }
        return false;
    }

    async skip() {
        if (this.stream?.finished) return false;
        this.stream?.finish();
        await this.finish();
        return true;
    }
}