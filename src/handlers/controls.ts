import { Composer } from "@mtkruto/node";
import { checkInactiveVc } from "../middlewares/inactiveVc";
import { queue } from "../queue";
import { tgcalls } from "../tgcalls";

const composer = new Composer();

composer.command(["pause", "p"], checkInactiveVc, async (ctx) => {
  const ok = await tgcalls.pause(ctx.chat!.id);
  await ctx.reply(ok ? "⏸ Paused." : "Not playing.");
});

composer.command(["resume", "r"], checkInactiveVc, async (ctx) => {
  const ok = await tgcalls.resume(ctx.chat!.id);
  await ctx.reply(ok ? "▶ Resumed." : "Not paused.");
});

composer.command(["skip", "next"], checkInactiveVc, async (ctx) => {
  const ok = await tgcalls.skip(ctx.chat!.id);
  await ctx.reply(ok ? "⏭ Skipped." : "Nothing to skip.");
});

composer.command("shuffle", checkInactiveVc, async (ctx) => {
  const chatId = ctx.chat!.id;
  if (!queue.has(chatId)) {
    await ctx.reply("Queue is empty.");
    return;
  }
  queue.shuffle(chatId);
  await ctx.reply("⇄ Queue shuffled.");
});

composer.command("stopvc", async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    await ctx.reply("This command works in groups only.");
    return;
  }
  const ok = await tgcalls.stop(ctx.chat.id);
  await ctx.reply(ok ? "⏹ Stopped." : "Nothing is playing.");
});

export default composer;
