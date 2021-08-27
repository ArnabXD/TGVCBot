/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Composer } from "grammy";
import axios from "axios";
import { stringify } from "querystring";
import { commandExtractor } from "../utils";
import {
  JioSaavnSongResponse,
  JioSaavnSongSearchResponse,
} from "../types/jiosaavn.response";
import { playOrQueueSong } from "../tgcalls";

const composer = new Composer();

export default composer;

composer.command(["jiosaavn", "jsvn"], async (ctx) => {
  await ctx.api.sendChatAction(ctx.chat.id, "typing");

  if (ctx.chat.type === "private")
    return await ctx.reply("This Command works on Group Only");

  let { args: keyword } = commandExtractor(ctx.message!.text);
  if (!keyword) return await ctx.reply("Please Provide Search Keyword");

  let query = stringify({ query: keyword.replace(/\s/g, "+") });
  let resp = (
    await axios.get<JioSaavnSongSearchResponse[]>(
      `https://jiosaavn-api.vercel.app/search?${query}`
    )
  ).data;

  if (!resp[0]) return await ctx.reply("No Results Found");

  let [result] = resp;
  let song = (
    await axios.get<JioSaavnSongResponse>(
      `https://jiosaavn-api.vercel.app/song?id=${result.id}`
    )
  ).data;

  await playOrQueueSong(
    { id: ctx.chat.id, name: ctx.chat.title },
    {
      link: song.perma_url,
      title: song.song.replace(/&quot;/g, `"`),
      image: song.image,
      artist: song.singers,
      duration: song.duration,
      requestedBy: {
        id: ctx.from!.id,
        first_name: ctx.from!.first_name,
      },
      mp3_link: song.other_qualities.pop()?.url ?? song.media_url,
      provider: "jiosaavn",
    }
  );
});
