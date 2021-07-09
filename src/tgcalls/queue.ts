import { Readable } from 'stream';

export interface QueueData {
    link: string;
    title: string;
    image: string;
    artist: string;
    requestedBy: {
        id: number,
        first_name: string
    };
    readable: Readable
}

class Queues {
    queues: { [key: number]: QueueData[] };

    constructor() {
        this.queues = {};
    }

    push(chatId: number, item: QueueData) {
        if (chatId in this.queues) this.queues[chatId].push(item);
        else this.queues[chatId] = [item];
        return this.queues[chatId].length;
    }

    get(chatId: number) {
        if (chatId in this.queues) {
            if (this.queues[chatId].length !== 0)
                return this.queues[chatId].shift();
        }
    }

    getAll(chatId: number) {
        if (chatId in this.queues) return this.queues[chatId];
        else return [];
    }

    clear(chatId: number) {
        if (chatId in this.queues) {
            delete this.queues[chatId];
            return true;
        } else return false;
    }
}

export const queue = new Queues();