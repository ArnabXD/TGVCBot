import { Composer, type InlineKeyboardButton } from "@mtkruto/node";
import { bot } from "../clients";
import env from "../env";
import { checkInactiveVc } from "../middlewares/inactiveVc";
import { queue } from "../queue";
import { tgcalls } from "../tgcalls";

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
  if (!env.WEBAPP_DIRECT_LINK) {
    await ctx.reply("Mini App URL is not configured in the bot environment.");
    return;
  }

  const me = await bot.getMe();
  const directLink =
    env.WEBAPP_DIRECT_LINK ||
    `https://t.me/${me.username}/${env.WEBAPP_SHORT_NAME}`;
  const cleanLink = directLink.endsWith("/")
    ? directLink.slice(0, -1)
    : directLink;

  const chatIdParam = ctx.chat.id.toString().replace(/^-/, "g");
  const button: InlineKeyboardButton = {
    type: "url",
    text: "🎵 Open Stream Controller",
    url: `${cleanLink}?startapp=${chatIdParam}`,
  };

  await ctx.reply(
    "🎵 <b>TGVCBot Stream Controller</b>\n\n" +
      "Click the button below to search for songs, view the queue, and control the active stream!",
    {
      parseMode: "HTML",
      replyMarkup: {
        type: "inlineKeyboard",
        inlineKeyboard: [[button]],
      },
    },
  );
});

export default composer;
