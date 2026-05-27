/**
 * MTKruto client instances.
 *
 * Two clients share the same API credentials but serve different roles:
 *   bot     — receives updates, sends messages (bot token auth)
 *   userbot — joins voice chats, streams audio (user account auth via SESSION)
 *
 * Both clients persist their sessions to disk via StorageLocalStorage so
 * re-authorisation is not required on every restart.
 */

import { Client, StorageLocalStorage } from "@mtkruto/node";
import env from "./env";

export const bot = new Client({
  apiId: env.API_ID,
  apiHash: env.API_HASH,
  storage: new StorageLocalStorage("./db/bot-session"),
});

export const userbot = new Client({
  apiId: env.API_ID,
  apiHash: env.API_HASH,
  storage: new StorageLocalStorage("./db/userbot-session"),
});

/**
 * Start both clients.
 * - userbot: imports the MTKruto authString from SESSION env var, then starts.
 * - bot: starts with the bot token.
 *
 * Both are started in parallel for faster startup.
 */
export async function startClients(): Promise<void> {
  await userbot.importAuthString(env.SESSION);

  await Promise.all([bot.start({ botToken: env.BOT_TOKEN }), userbot.start()]);
}

/**
 * Send a message to LOG_CHANNEL.
 * Used for operational logs (startup, errors) visible to the bot owner.
 */
export async function log(text: string): Promise<void> {
  try {
    await bot.sendMessage(env.LOG_CHANNEL, text);
  } catch {
    console.error("[log] Failed to send log message:", text);
  }
}
