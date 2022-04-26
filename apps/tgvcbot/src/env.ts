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
  THUMBNAIL: str({
    default: 'https://telegra.ph/file/6b07279fd80ef2b844ed0.png'
  }),
  WATERMARK: str({ default: 'TGVCBot' })
});

export default env;
