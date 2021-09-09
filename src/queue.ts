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
  provider: 'jiosaavn' | 'youtube' | 'telegram' | 'ytvideo';
}

class Queues {
  queues: Map<number, QueueData[]>;

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

  delete(chatId: number, position: number) {
    let queue = this.queues.get(chatId);
    if (queue && position <= queue.length) {
      return queue.splice(position - 1, 1);
    }
  }

  clear(chatId: number) {
    return this.queues.delete(chatId);
  }
}

export const queue = new Queues();
