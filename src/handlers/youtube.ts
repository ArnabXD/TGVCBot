/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Composer } from 'grammy';
import { commandExtractor } from '../utils';
import ytsearch from 'yt-search';
import { playOrQueueSong } from '../tgcalls';

const composer = new Composer();

export default composer;

composer.command(['youtube', 'yt'], async ctx => {
  await ctx.api.sendChatAction(ctx.chat.id, 'typing');

  if (ctx.chat.type === 'private')
    return await ctx.reply('This Command works on Group Only');

  let { args: query } = commandExtractor(ctx.message!.text);
  if (!query)
    return await ctx.reply('Please Provide Search Keyword/Youtube Link');

  const { videos } = await ytsearch.search({ query, pages: 1 });
  if (!videos || videos.length < 1) return await ctx.reply('No Results Found');

  let [video] = videos;
  await playOrQueueSong(
    { id: ctx.chat.id, name: ctx.chat.title },
    {
      title: video.title,
      link: video.url,
      image: video.image,
      duration: `${video.duration.seconds}`,
      artist: video.author.name,
      requestedBy: {
        id: ctx.from!.id,
        first_name: ctx.from!.first_name,
      },
      mp3_link: video.videoId,
      provider: 'youtube',
    },
  );
});
