import { consola } from "consola";
import { bot, log, startClients } from "./clients";
import env from "./env";
import { testFFMPEG } from "./ffmpeg";
import { initHandlers } from "./handlers";
import { startWebServer } from "./server";

const LOG_LEVELS: Record<string, number> = {
  silent: 0, error: 1, warn: 2, info: 3, debug: 4, verbose: 5,
};
consola.level = LOG_LEVELS[env.LOG_LEVEL] ?? 3;

const logger = consola.withTag("app");

// ── Startup checks ────────────────────────────────────────────────────────────

testFFMPEG();

// ── Register handlers before connecting ──────────────────────────────────────

initHandlers(bot);

// ── Start HTTP web server for Mini App ────────────────────────────────────────

startWebServer();

// ── Connect both clients and start receiving updates ─────────────────────────

await startClients();
await log("♫ TGVCBot is running");
logger.success("Started");
