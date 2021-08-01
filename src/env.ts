import { cleanEnv, num, str } from 'envalid';
import dotenv from 'dotenv';
dotenv.config();

const env = cleanEnv(process.env, {
    API_ID: num(),
    API_HASH: str(),
    SESSION: str(),
    BOT_TOKEN: str(),
    LOG_CHANNEL: num(),
    CODEC: str({ default: "-c copy" })
})

export default env;