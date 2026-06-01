import { cleanEnv, num, str } from "envalid";

const env = cleanEnv(process.env, {
  API_ID: num(),
  API_HASH: str(),
  SESSION: str({
    docs: "MTKruto authString — generate with `bun run gen-session`",
  }),
  BOT_TOKEN: str(),
  LOG_CHANNEL: num(),
  THUMBNAIL: str({
    default: "https://telegra.ph/file/6b07279fd80ef2b844ed0.png",
  }),
  WATERMARK: str({ default: "TGVCBot" }),
  PORT: num({ default: 3000 }),
  LOG_LEVEL: str({
    default: "info",
    choices: ["silent", "error", "warn", "info", "debug", "verbose"],
  }),
  WEBAPP_URL: str({ default: "" }),
  WEBAPP_SHORT_NAME: str({ default: "app" }),
  WEBAPP_DIRECT_LINK: str({ default: "" }),
});

export default env;
