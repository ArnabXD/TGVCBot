/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { spawn } from 'child_process';
import { Readable } from 'stream';

const audioArgs =
  '-acodec pcm_s16le -f s16le -ac 1 -ar 48000 -tune zerolatency pipe:1';
const videoArgs =
  '-f rawvideo -vf scale=640:-1 -r 20 -preset ultrafast -tune zerolatency pipe:1';

export const ffmpeg = async (
  input: string,
  video: boolean = false
): Promise<[Readable, () => void]> => {
  return new Promise((resolve, reject) => {
    let process = spawn('ffmpeg', [
      '-y',
      '-nostdin',
      '-i',
      `${input}`,
      ...(video ? videoArgs : audioArgs).split(/\s/g)
    ]);

    process.stdout.once('error', () => reject());

    process.stdout.once('readable', () => {
      resolve([
        process.stdout,
        () => {
          try {
            process.kill();
          } catch (e) {}
        }
      ]);
    });
  });
};
