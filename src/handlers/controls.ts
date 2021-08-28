/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Composer } from 'grammy';
import { TgCalls, playOrQueueSong } from '../tgcalls';
import { queue } from '../queue';

const composer = new Composer();

export default composer;

composer.command(['pause', 'p'], ctx => {
  if (ctx.chat.type === 'private')
    return ctx.reply('This Command works on Group Only');
  if (!TgCalls.connected(ctx.chat.id)) return ctx.reply('Inactive VC');

  return ctx.reply(TgCalls.pause(ctx.chat.id) ? 'Paused' : 'Not Playing');
});

composer.command(['resume', 'r'], ctx => {
  if (ctx.chat.type === 'private')
    return ctx.reply('This Command works on Group Only');
  if (!TgCalls.connected(ctx.chat.id)) return ctx.reply('Inactive VC');

  return ctx.reply(TgCalls.resume(ctx.chat.id) ? 'Resumed' : 'Not Paused');
});

composer.command(['skip', 'next'], async ctx => {
  if (ctx.chat.type === 'private')
    return await ctx.reply('This Command works on Group Only');
  if (!TgCalls.connected(ctx.chat.id)) return await ctx.reply('Inactive VC');

  let next = queue.get(ctx.chat.id);

  if (next) {
    TgCalls.pause(ctx.chat.id);
    await playOrQueueSong(
      { id: ctx.chat.id, name: ctx.chat.title },
      next,
      true,
    );
    TgCalls.resume(ctx.chat.id);
    return;
  }

  await TgCalls.stop(ctx.chat.id);
});

composer.command('stopvc', async ctx => {
  if (ctx.chat.type === 'private')
    return await ctx.reply('This Command works on Group Only');
  if (!TgCalls.connected(ctx.chat.id)) return await ctx.reply('Inactive VC');

  queue.clear(ctx.chat.id);

  if (await TgCalls.stop(ctx.chat.id)) {
    return await ctx.reply('Stopped');
  }
});
