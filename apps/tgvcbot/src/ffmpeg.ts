/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';

// Credits - https://github.com/callsmusic/remix/blob/main/src/bot/convert.ts
export function getReadable(input: string) {
  return ffmpeg(input)
    .format('s16le')
    .audioFrequency(48000)
    .audioChannels(1)
    .pipe() as PassThrough;
}

export function TestFFMPEG() {
  const ffmpeg = spawn('ffmpeg');
  ffmpeg.once('error', (e) => {
    switch (e.message) {
      case 'spawn ffmpeg ENOENT':
        console.log('[Error] : FFMPEG not found');
        break;
      default:
        console.log(e.message);
        break;
    }
    process.exit();
  });
}
