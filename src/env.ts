/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { cleanEnv, num, str } from 'envalid';
import dotenv from 'dotenv';
dotenv.config();

const env = cleanEnv(process.env, {
  API_ID: num(),
  API_HASH: str(),
  SESSION: str(),
  BOT_TOKEN: str(),
  LOG_CHANNEL: num(),
  CODEC: str({ default: '-c:a libmp3lame -b:a 128K' }),
  MAX_DURATION: num({ default: 360 }),
});

export default env;
