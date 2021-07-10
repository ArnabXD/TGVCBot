import { Player } from './player';
import { Readable } from 'stream';
import { leaveCall } from '../calls';
import { queue } from './queue';

export class Connection {
    connections: { [key: number]: Player };

    constructor() {
        this.connections = {};
    }

    async setReadable(chatId: number, readable: Readable) {
        if (chatId in this.connections)
            this.connections[chatId].setReadable(readable);
        else {
            const connection = new Player(chatId, () => this.remove(chatId));
            await connection.joinCall(readable);
            this.connections[chatId] = connection;
        }
    }

    inCall(chatId: number) {
        return !!this.connections[chatId];
    }

    playing(chatId: number) {
        if (this.inCall(chatId))
            if (this.connections[chatId].playing) return true;
        return false;
    }

    pause(chatId: number) {
        if (this.inCall(chatId)) {
            if (this.connections[chatId].pause()) return 0;
            else return 1;
        } else return 2;
    }

    resume(chatId: number) {
        if (this.inCall(chatId)) {
            if (this.connections[chatId].resume()) return 0;
            else return 1;
        } else return 2;
    }

    async skip(chatId: number) {
        if (this.inCall(chatId)) {
            if (await this.connections[chatId].skip()) {
                return 0;
            } else return 1;
        } else return 2;
    }

    async stop(chatId: number) {
        if (this.inCall(chatId)) {
            if (await this.connections[chatId].skip()) {
                this.remove(chatId);
                return 0;
            } else return 1;
        } else return 2;
    }

    remove(chatId: number) {
        if (chatId in this.connections) {
            queue.clear(chatId)
            leaveCall(chatId);
            delete this.connections[chatId];
            return true;
        } else return false;
    }

    async closeAll() {
        Object.keys(this.connections).forEach(async (key) => {
            try {
                await leaveCall(Number(key))
            } catch { }
        })
    }
}

export const connections = new Connection();