import { consola } from "consola";
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
  NTGCALLS_LOG_LEVEL: str({
    default: "error",
    choices: ["silent", "error", "warn", "info", "debug"],
    docs: "Minimum level for native ntgcalls (C++) logs. Defaults to error to silence verbose DEBUG/INFO spam.",
  }),
  WEBAPP_SHORT_NAME: str({
    default: "",
    docs: "Mini App short name registered with @BotFather. When set, /play and /app show a button that opens https://t.me/<bot>/<short-name> as a Mini App. Leave empty to disable.",
  }),
});

// Set the global consola level here — before any other module imports env and
// creates a tagged logger via consola.withTag(). Tagged loggers capture the
// level at creation time and ignore later changes, so setting it in app.ts
// (which imports logger-creating modules first) was too late and silently
// dropped every logger.debug() call.
const LOG_LEVELS: Record<string, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  verbose: 5,
};
consola.level = LOG_LEVELS[env.LOG_LEVEL] ?? 3;

export default env;
