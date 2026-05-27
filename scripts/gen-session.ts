/**
 * One-time MTKruto auth string generator.
 *
 * Run with:
 *   bun run gen-session
 *
 * This logs in as a real Telegram user account (not a bot) and prints the
 * resulting authString.  Copy it into your .env as SESSION=<value>.
 *
 * The script exits cleanly after printing — it does not start the bot.
 */

import { Client } from "@mtkruto/node";
import { deviceConfig } from "../src/device";

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;

if (!apiId || !apiHash) {
  console.error("Error: API_ID and API_HASH must be set in the environment.");
  console.error("Create a .env file with these two values and run again.");
  process.exit(1);
}

const client = new Client({ apiId, apiHash, ...deviceConfig });

await client.start({
  phone: () => {
    process.stdout.write("Phone number (with country code): ");
    return new Promise((resolve) => {
      process.stdin.once("data", (d) => resolve(d.toString().trim()));
    });
  },
  code: () => {
    process.stdout.write("Verification code: ");
    return new Promise((resolve) => {
      process.stdin.once("data", (d) => resolve(d.toString().trim()));
    });
  },
  password: () => {
    process.stdout.write("2FA password (leave blank if none): ");
    return new Promise((resolve) => {
      process.stdin.once("data", (d) => resolve(d.toString().trim()));
    });
  },
});

const authString = await client.exportAuthString();
console.log("\n✅ Session generated. Add this to your .env:\n");
console.log(`SESSION=${authString}`);
console.log();

await client.disconnect();
process.exit(0);
