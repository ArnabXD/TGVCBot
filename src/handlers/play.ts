/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

import { Composer } from 'telegraf';
import { playOrQueueSong } from '../tgcalls';
import { getMessageLink } from '../utils';

export const Play = Composer.command(['play', 'pl'], async ctx => {
    await ctx.telegram.sendChatAction(ctx.chat.id, "typing");
    
    if (ctx.chat.type === 'private') return await ctx.reply("This Command works on Group Only");

    if (
        !ctx.message.reply_to_message ||
        !('audio' in ctx.message.reply_to_message)
    ) return await ctx.reply("Please reply this command to a audio file");

    let { reply_to_message: message } = ctx.message

    await playOrQueueSong(
        { id: ctx.chat.id, name: ctx.chat.title },
        {
            title: message.audio.title!,
            duration: message.audio.duration.toString(),
            image: message.audio.thumb?.file_id ?? `https://telegra.ph/file/c1715dedc403ebf896e57.jpg`,
            artist: message.audio.performer ?? "TGVCBot",
            link: getMessageLink(ctx.chat.id, message.message_id),
            mp3_link: message.audio.file_id,
            provider: 'telegram',
            requestedBy: {
                first_name: ctx.from.first_name,
                id: ctx.from.id
            }
        }
    )

})
