/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Context, MiddlewareFn } from 'grammy';
import { log } from '../bot';
import { escape } from 'html-escaper';

export const ErrorHandler: MiddlewareFn<Context> = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    let error = String(err);
    if (
      error.includes('Could not find the input entity') ||
      error.includes('Cannot cast InputPeerChat')
    ) {
      await ctx.reply(
        "My VC User is unable to join the Voice Chat here, So can't play anything. Bye Bye"
      );
      return await ctx.leaveChat();
    }
    await ctx.reply(`<code>${escape(String(err))}</code>`, {
      parse_mode: 'HTML'
    });
    await log(`<code>${escape(String(err))}</code>`);
  }
};
