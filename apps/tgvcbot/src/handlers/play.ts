/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Composer } from 'grammy';
import env from '../env';
import { tgcalls } from '../tgcalls';
import { getMessageLink } from '../utils';

const composer = new Composer();

composer.command(['play', 'pl'], async (ctx) => {
  console.log(1);
  await ctx.api.sendChatAction(ctx.chat.id, 'typing');
  if (ctx.chat.type === 'private') {
    await ctx.reply('This Command works on Group Only');
    return;
  }
  if (ctx.message?.reply_to_message && ctx.message.reply_to_message.audio) {
    const msg = ctx.message.reply_to_message;
    const audio = ctx.message.reply_to_message.audio;
    await tgcalls.streamOrQueue(
      { id: ctx.chat.id, name: ctx.chat.title },
      {
        title: audio.title || 'Unknown',
        duration: audio.duration.toString(),
        image: audio.thumb?.file_id ?? env.THUMBNAIL,
        artist: audio.performer ?? 'TGVCBot',
        link: getMessageLink(ctx.chat.id, msg.message_id),
        mp3_link: audio.file_id,
        provider: 'telegram',
        requestedBy: {
          first_name: ctx.from.first_name,
          id: ctx.from.id
        }
      }
    );
  } else {
    await ctx.reply('Please reply this command to a audio file');
    return;
  }
});

export default composer;
