/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { spawn } from 'child_process';
import { Readable } from 'stream';

const audioArgs = '-acodec pcm_s16le -f s16le -ac 1 -ar 48000 pipe:1';

export const ffmpeg = async (
  input: string
): Promise<[Readable, () => void]> => {
  return new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', [
      '-y',
      '-nostdin',
      '-i',
      `${input}`,
      ...audioArgs.split(/\s/g)
    ]);

    process.stderr.once('error', (e) => reject(e.message));

    process.stdout.once('readable', () => {
      resolve([
        process.stdout,
        () => {
          try {
            process.kill();
          } catch (e) {
            //
          }
        }
      ]);
    });
  });
};

export const TestFFMPEG = (): void => {
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
};
