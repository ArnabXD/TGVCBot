export interface QueueData {
    link: string;
    title: string;
    image: string;
    artist: string;
    duration: string;
    requestedBy: {
        id: number;
        first_name: string;
    };
    mp3_link: string;
    provider: 'jiosaavn' | 'youtube'
}

class Queues {
    queues: Map<number, QueueData[]>

    constructor() {
        this.queues = new Map<number, QueueData[]>();
    }

    push(chatId: number, item: QueueData) {
        let queue = this.queues.get(chatId);
        if (queue) {
            return queue.push(item);
        } else {
            this.queues.set(chatId, [item]);
            return 1;
        }
    }

    get(chatId: number) {
        let queue = this.queues.get(chatId);
        if (queue) return queue.shift();
    }

    has(chatId: number) {
        return !!this.queues.get(chatId);
    }

    getAll(chatId: number) {
        return this.queues.get(chatId);
    }

    clear(chatId: number) {
        return this.queues.delete(chatId);
    }
}

export const queue = new Queues();