/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { spawn } from 'child_process';
import env from './env';

const args = `${env.CODEC} -acodec pcm_s16le -f s16le -ac 1 -ar 65000 pipe:1`;

export const ffmpeg = (input: string) => {
  let process = spawn('ffmpeg', [
    '-y',
    '-nostdin',
    '-i',
    `${input}`,
    ...args.split(/\s/g)
  ]);
  return {
    readable: process.stdout,
    killProcess: async () => {
      try {
        process.kill();
      } catch (e) {}
    }
  };
};
