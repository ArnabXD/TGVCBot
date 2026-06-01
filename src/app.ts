import { consola } from "consola";
import { bot, log, startClients } from "./clients";
// env sets consola.level as a side effect — keep this import before withTag().
import "./env";
import { testFFMPEG } from "./ffmpeg";
import { initHandlers } from "./handlers";
import { startWebServer } from "./server";

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
