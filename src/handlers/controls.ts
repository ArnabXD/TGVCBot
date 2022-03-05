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

const composer = new Composer();

composer.use(async (ctx, next) => {
  if (ctx && ctx.chat) {
    if (ctx.chat.type === 'private') {
      await ctx.reply('This Command works on Group Only');
      return;
    }
    if (!tgcalls.connected(ctx.chat.id)) {
      await ctx.reply('Inactive VC');
      return;
    }
    await next();
  }
});

composer.command(['pause', 'p'], async (ctx) => {
  await ctx.reply(tgcalls.pause(ctx.chat.id) ? 'Paused' : 'Not Playing');
});

composer.command(['resume', 'r'], async (ctx) => {
  await ctx.reply(tgcalls.resume(ctx.chat.id) ? 'Resumed' : 'Not Paused');
});

composer.command(['skip', 'next'], async (ctx) => {
  const next = queue.get(ctx.chat.id);
  if (next && 'title' in ctx.chat) {
    tgcalls.pause(ctx.chat.id);
    await tgcalls.streamOrQueue(
      { id: ctx.chat.id, name: ctx.chat.title },
      next,
      true
    );
    tgcalls.resume(ctx.chat.id);
    return;
  }
  await tgcalls.stop(ctx.chat.id);
});

composer.command(['shuffle'], async (ctx) => {
  const playlist = queue.getAll(ctx.chat.id);
  if (playlist && playlist.length) {
    queue.shuffle(ctx.chat.id);
    await ctx.reply('Shuffled the playlist');
  } else {
    await ctx.reply('No Playlist to shuffle');
  }
});

composer.command('stopvc', async (ctx) => {
  queue.clear(ctx.chat.id);
  if (await tgcalls.stop(ctx.chat.id)) {
    await ctx.reply('Stopped');
  }
});

export default composer;
