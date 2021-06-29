import { Player } from './player';
import { Readable } from 'stream';
import { leaveCall } from '../calls';

export class Connection {
    connection: { [key: number]: Player };

    constructor() {
        this.connection = {}
    }

    async setReadable(chatID: number, readable: Readable) {
        if (chatID in this.connection) {
            this.connection[chatID].setReadable(readable)
        } else {
            let player = new Player(chatID, () => this.close(chatID));
            await player.play(readable);
            this.connection[chatID] = player;
        }
    }

    inCall(chatId: number) {
        return !!this.connection[chatId];
    }

    playing(chatId: number) {
        if (this.inCall(chatId))
            if (this.connection[chatId].playing) return true;
        return false;
    }

    pause(chatId: number) {
        if (this.inCall(chatId)) {
            if (this.connection[chatId].pause()) return 0;
            else return 1;
        } else return 2;
    }

    resume(chatId: number) {
        if (this.inCall(chatId)) {
            if (this.connection[chatId].resume()) return 0;
            else return 1;
        } else return 2;
    }

    async skip(chatId: number) {
        if (this.inCall(chatId)) {
            if (await this.connection[chatId].skip()) {
                // this.close(chatId);
                return 0;
            } else return 1;
        } else return 2;
    }

    close(chatID: number) {
        if (!(chatID in this.connection)) return false;
        this.connection[chatID].stream.emit('finish');
        delete this.connection[chatID];
        return true;
    }

    async closeAll() {
        Object.keys(this.connection).forEach(async (key) => {
            try {
                await leaveCall(Number(key))
            } catch { }
        })
    }
}

export const connections = new Connection();