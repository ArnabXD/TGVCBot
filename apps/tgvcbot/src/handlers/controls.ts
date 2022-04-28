/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Composer } from 'grammy';
import { tgcalls } from '../tgcalls';
import { queue } from '../queue';
import { CheckInactiveVcMiddleware } from '../middlewares';

const composer = new Composer();

composer.command(['pause', 'p'], CheckInactiveVcMiddleware, async (ctx) => {
  await ctx.reply(tgcalls.pause(ctx.chat.id) ? 'Paused' : 'Not Playing');
});

composer.command(['resume', 'r'], CheckInactiveVcMiddleware, async (ctx) => {
  await ctx.reply(tgcalls.resume(ctx.chat.id) ? 'Resumed' : 'Not Paused');
});

composer.command(['skip', 'next'], CheckInactiveVcMiddleware, async (ctx) => {
  const next = await queue.get(ctx.chat.id);
  if (next && 'title' in ctx.chat) {
    tgcalls.pause(ctx.chat.id);
    await tgcalls.streamOrQueue(
      { id: ctx.chat.id, name: ctx.chat.title },
      {
        title: next.title,
        artist: next.artist,
        link: next.link,
        duration: next.duration,
        image: next.image,
        mp3_link: next.mp3_link,
        provider: next.provider,
        requestedBy: {
          id: next.req_by_id,
          first_name: next.req_by_fname
        }
      },
      true
    );
    tgcalls.resume(ctx.chat.id);
    return;
  }
  await tgcalls.stop(ctx.chat.id);
});

composer.command(['shuffle'], CheckInactiveVcMiddleware, async (ctx) => {
  const playlist = await queue.getAll(ctx.chat.id);
  if (playlist && playlist.length) {
    queue.shuffle(ctx.chat.id);
    await ctx.reply('Shuffled the playlist');
  } else {
    await ctx.reply('No Playlist to shuffle');
  }
});

composer.command('stopvc', async (ctx) => {
  await queue.clear(ctx.chat.id);
  if (await tgcalls.stop(ctx.chat.id)) {
    await ctx.reply('Stopped');
  }
});

export default composer;
