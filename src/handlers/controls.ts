import { Composer } from "@mtkruto/node";
import { checkInactiveVc } from "../middlewares/inactiveVc";
import { queue } from "../queue";
import { tgcalls } from "../tgcalls";
import { controllerKeyboard } from "../utils/keyboard";

const composer = new Composer();

composer.command(["pause", "p"], checkInactiveVc, async (ctx) => {
  const chatId = ctx.chat!.id;
  if (tgcalls.isPaused(chatId)) {
    await ctx.reply("Already paused.");
    return;
  }
  const ok = await tgcalls.pause(chatId);
  await ctx.reply(ok ? "‖ Paused." : "Not playing.");
});

composer.command(["resume", "r"], checkInactiveVc, async (ctx) => {
  const ok = await tgcalls.resume(ctx.chat!.id);
  await ctx.reply(ok ? "▶ Resumed." : "Not paused.");
});

composer.command(["skip", "next"], checkInactiveVc, async (ctx) => {
  const ok = await tgcalls.skip(ctx.chat!.id);
  await ctx.reply(ok ? "» Skipped." : "Nothing to skip.");
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
  await ctx.reply(ok ? "■ Stopped." : "Nothing is playing.");
});

composer.command(["app", "vcapp", "controller"], async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    await ctx.reply("This command works in groups only.");
    return;
  }
  const replyMarkup = await controllerKeyboard(ctx.chat.id);
  if (!replyMarkup) {
    await ctx.reply("Mini App is not configured in the bot environment.");
    return;
  }

  await ctx.reply(
    "🎵 <b>TGVCBot Stream Controller</b>\n\n" +
      "Click the button below to search for songs, view the queue, and control the active stream!",
    { parseMode: "HTML", replyMarkup },
  );
});

export default composer;
