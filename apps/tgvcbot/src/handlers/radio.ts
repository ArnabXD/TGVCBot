/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Composer } from 'grammy';
import { tgcalls } from '../tgcalls';
import env from '../env';

const composer = new Composer();

composer.command(['radio', 'stream'], async (ctx) => {
  if (ctx.chat.type === 'private' || !ctx.from) {
    await ctx.reply('This Command works on Group Only');
    return;
  }
  if (!ctx.match) {
    await ctx.reply('Please provide a radio/stream link');
    return;
  }
  if (!ctx.match.startsWith('http')) {
    await ctx.reply('Invalid');
    return;
  }
  await ctx.api.sendChatAction(ctx.chat.id, 'upload_photo');
  await tgcalls.streamOrQueue(
    { id: ctx.chat.id, name: ctx.chat.title },
    {
      link: ctx.match,
      title: 'Radio',
      image: env.THUMBNAIL,
      artist: '...',
      duration: '',
      requestedBy: {
        id: ctx.from.id,
        first_name: ctx.from.first_name
      },
      mp3_link: ctx.match,
      provider: 'radio'
    }
  );
});

export default composer;
