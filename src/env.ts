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
  NTGCALLS_LIB_PATH: str({ docs: "Absolute path to libntgcalls.so / .dylib" }),
});

export default env;
