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
    queue: { [key: number]: QueueData[] };

    constructor() {
        this.queue = {}
    }

    init(chatId: number) {
        this.queue[chatId] = []
        return this.queue[chatId];
    }

    add(chatId: number, data: QueueData) {
        if (chatId in this.queue) {
            return this.queue[chatId].push(data)
        } else {
            this.queue[chatId] = [data]
            return 1;
        }
    }

    get(chatId: number) {
        if (chatId in this.queue) {
            if (this.queue[chatId].length !== 0) {
                return this.queue[chatId].shift()
            }
        }
    }

    getAll(chatId: number) {
        if (chatId in this.queue) return this.queue[chatId];
        return [];
    }

    hasNoData(chatId: number) {
        if (chatId in this.queue) {
            if (this.queue[chatId].length !== 0) {
                return false;
            }
        }
        return true;
    }

    clear(chatId: number) {
        if (chatId in this.queue) {
            delete this.queue[chatId];
            return true;
        }
        return false;
    }
}

export const queue = new Queues();