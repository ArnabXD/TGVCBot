import { bot, log, startClients } from "./clients";
import { testFFMPEG } from "./ffmpeg";
import { initHandlers } from "./handlers";

// ── Startup checks ────────────────────────────────────────────────────────────

testFFMPEG();

// ── Register handlers before connecting ──────────────────────────────────────

initHandlers(bot);

// ── Connect both clients and start receiving updates ─────────────────────────

await startClients();
await log("♫ TGVCBot is running");
console.log("[TGVCBot] Started");
