/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import Database from 'better-sqlite3';
import knex from './knex';

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
  provider: 'jiosaavn' | 'youtube' | 'telegram' | 'radio';
}

interface KnexQueue {
  id: number;
  chat_id: number;
  link: string;
  title: string;
  image: string;
  artist: string;
  duration: string;
  req_by_id: number;
  req_by_fname: string;
  mp3_link: string;
  provider: 'jiosaavn' | 'youtube' | 'telegram' | 'radio';
}

export class Queues {
  constructor() {
    //
  }

  static async init() {
    // Create sqlite file if doesn't exist
    const db = new Database('./db/tgvc.sqlite');
    db.close();

    // Create or Truncate Table `queue`
    if (!(await knex.schema.hasTable('queue'))) {
      await knex.schema.createTable('queue', (queue) => {
        queue.increments('id');
        queue.integer('chat_id');
        queue.string('link', 255);
        queue.string('title', 255);
        queue.string('image', 255);
        queue.string('artist', 255);
        queue.string('duration', 7);
        queue.integer('req_by_id');
        queue.string('req_by_fname', 255);
        queue.string('mp3_link', 255);
        queue.enum('provider', ['jiosaavn', 'youtube', 'telegram', 'radio']);
      });
    } else {
      await knex('queue').truncate();
    }

    // Create or Truncate Table `current`
    if (!(await knex.schema.hasTable('current'))) {
      await knex.schema.createTable('current', (current) => {
        current.increments('id');
        current.integer('chat_id').unique();
        current.string('link', 255);
        current.string('title', 255);
        current.string('image', 255);
        current.string('artist', 255);
        current.string('duration', 7);
        current.integer('req_by_id');
        current.string('req_by_fname', 255);
        current.string('mp3_link', 255);
        current.enum('provider', ['jiosaavn', 'youtube', 'telegram', 'radio']);
      });
    } else {
      await knex('current').truncate();
    }
  }

  async push(
    chatId: number,
    {
      artist,
      title,
      link,
      image,
      duration,
      mp3_link,
      provider,
      requestedBy
    }: QueueData
  ) {
    await knex<KnexQueue>('queue').insert({
      chat_id: chatId,
      title,
      link,
      artist,
      image,
      duration,
      mp3_link,
      provider,
      req_by_id: requestedBy.id,
      req_by_fname: requestedBy.first_name
    });

    return (await knex<KnexQueue>('queue').where({ chat_id: chatId })).length;
  }

  async get(chatId: number) {
    const queue = await knex<KnexQueue>('queue')
      .where({ chat_id: chatId })
      .orderBy('id', 'asc');
    if (queue.length) {
      await knex<KnexQueue>('queue').where(queue[0]).first().del();
      return queue[0];
    }
  }

  async setCurrent(chatId: number, data: QueueData) {
    await knex<KnexQueue>('queue')
      .insert({
        chat_id: chatId,
        title: data.title,
        artist: data.artist,
        duration: data.duration,
        image: data.image,
        link: data.link,
        mp3_link: data.mp3_link,
        provider: data.provider,
        req_by_id: data.requestedBy.id,
        req_by_fname: data.requestedBy.first_name
      })
      .onConflict('chat_id')
      .merge();
  }

  async has(chatId: number) {
    return (await knex<KnexQueue>('queue').where({ chat_id: chatId })).length;
  }

  async getAll(chatId: number) {
    return await knex<KnexQueue>('queue').where({ chat_id: chatId });
  }

  async shuffle(chatId: number) {
    const all = await knex<KnexQueue>('queue').where({ chat_id: chatId });
    if (!all.length) {
      return;
    }

    console.log(all);
    // https://en.wikipedia.org/wiki/Schwartzian_transform
    const shuffled = all
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
    console.log(shuffled);

    await knex<KnexQueue>('queue').where({ chat_id: chatId }).del();
    await knex<KnexQueue>('queue').insert(
      shuffled.map(({ id: _id, ...rest }) => rest)
    );
  }

  async delete(chatId: number, position: number) {
    const queue = await knex<KnexQueue>('queue').where({ chat_id: chatId });
    if (queue && position <= queue.length) {
      const [sel] = queue.splice(position - 1, 1);
      await knex<KnexQueue>('queue')
        .where({ ...sel })
        .first()
        .del();
      return sel;
    }
  }

  async clear(chatId: number) {
    return await knex<KnexQueue>('queue').where({ chat_id: chatId }).del();
  }
}

export const queue = new Queues();
