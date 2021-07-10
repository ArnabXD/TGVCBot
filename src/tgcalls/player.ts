import { TGCalls, Stream } from 'tgcalls';
import { joinCall, leaveCall } from '../calls';
import { Readable } from 'stream';
import { queue } from './queue';
import { sendPlayingMessage } from '../utils';

export class Player {
    chatId: number;
    playing: boolean;
    stream?: Stream;
    tgcalls: TGCalls<{ chatId: number }>;
    remove: () => void;

    constructor(chatId: number, remove: () => void) {
        this.chatId = chatId;
        this.playing = false;
        this.tgcalls = new TGCalls({ chatId });
        this.tgcalls.joinVoiceCall = async (payload) => await joinCall(chatId, payload);
        this.remove = remove;
    }

    async end() {
        this.playing = false;
        let next = queue.get(this.chatId);
        if (next?.readable) {
            this.setReadable(next.readable);
            await sendPlayingMessage(this.chatId, next);
        } else {
            await leaveCall(this.chatId);
            this.remove();
        }
    }

    async joinCall(readable: Readable) {
        this.stream = new Stream(readable, 16, 48000, 1);
        this.stream.addListener('finish', () => this.end());
        await this.tgcalls.start(this.stream.createTrack());
        this.playing = true;
    }

    async setReadable(readable: Readable) {
        this.stream?.setReadable(readable);
        this.playing = true;
    }

    pause() {
        if (!this.stream?.paused && this.playing) {
            this.stream?.pause();
            return true;
        } else return false;
    }

    resume() {
        if (this.stream?.paused && this.playing) {
            this.stream?.pause();
            return true;
        } else return false;
    }

    async skip() {
        if (this.stream?.finished) return false;
        this.stream?.stop();
        await this.end();
        return true;
    }
};
