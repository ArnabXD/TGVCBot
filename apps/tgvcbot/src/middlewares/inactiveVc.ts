/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Context, MiddlewareFn } from 'grammy';
import { tgcalls } from '../tgcalls';

export const CheckInactiveVcMiddleware: MiddlewareFn<Context> = async (
  ctx,
  next
) => {
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
};
