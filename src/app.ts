import { consola } from "consola";
import { bot, log, startClients } from "./clients";
import env from "./env";
import { testFFMPEG } from "./ffmpeg";
import { initHandlers } from "./handlers";
import { startWebServer } from "./server";

if (env.DEBUG) consola.level = 5; // enable debug logs

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
