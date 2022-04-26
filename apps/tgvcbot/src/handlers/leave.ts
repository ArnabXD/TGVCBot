/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Composer } from 'grammy';
import { leaveCall, getFullChat } from 'tgcalls-next/lib/utils';
import { userbot } from '../userbot';
import { tgcalls } from '../tgcalls';

const composer = new Composer();

composer.command('leave', async (ctx) => {
  if (!['group', 'supergroup'].includes(ctx.chat.type)) {
    return await ctx.reply('This Command works on Group Only');
  }

  if (tgcalls.finished(ctx.chat.id)) {
    return await ctx.reply("Stream isn't finished yet");
  }

  const chat = await getFullChat(userbot, ctx.chat.id);
  if (!chat.call) {
    await ctx.reply('No Active Call');
    return;
  }
  await leaveCall(userbot, chat.call);
  await ctx.reply('Left Voice Call');
});

export default composer;
