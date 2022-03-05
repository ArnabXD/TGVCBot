/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

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
  provider: 'jiosaavn' | 'telegram' | 'radio';
}

class Queues {
  queues: Map<number, QueueData[]>;

  constructor() {
    this.queues = new Map<number, QueueData[]>();
  }

  push(chatId: number, item: QueueData) {
    const queue = this.queues.get(chatId);
    if (queue) {
      return queue.push(item);
    } else {
      this.queues.set(chatId, [item]);
      return 1;
    }
  }

  get(chatId: number) {
    const queue = this.queues.get(chatId);
    if (queue) {
      const current = queue.shift();
      return current;
    }
  }

  has(chatId: number) {
    return !!this.queues.get(chatId);
  }

  getAll(chatId: number) {
    return this.queues.get(chatId);
  }

  shuffle(chatId: number) {
    const all = this.queues.get(chatId);
    if (!all) {
      return;
    }

    // https://en.wikipedia.org/wiki/Schwartzian_transform
    this.queues.set(
      chatId,
      all
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
    );
  }

  delete(chatId: number, position: number) {
    const queue = this.queues.get(chatId);
    if (queue && position <= queue.length) {
      return queue.splice(position - 1, 1);
    }
  }

  clear(chatId: number) {
    return this.queues.delete(chatId);
  }
}

export const queue = new Queues();
