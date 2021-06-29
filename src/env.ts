import dotenv from 'dotenv';
dotenv.config({});

const env = {
    API_ID: Number(process.env.API_ID),
    API_HASH: process.env.API_HASH,
    SESSION: process.env.SESSION,
    OWNER_ID: Number(process.env.OWNER_ID),
    BOT_TOKEN: process.env.BOT_TOKEN,
    LOG_CHANNEL: Number(process.env.LOG_CHANNEL)
}

export default env;