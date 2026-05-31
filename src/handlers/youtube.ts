import { Composer, type InlineKeyboardButton } from "@mtkruto/node";
import { consola } from "consola";
import { yt } from "../providers/youtube";
import { tgcalls } from "../tgcalls";

const logger = consola.withTag("handler:youtube");

const composer = new Composer();

function cmdArgs(text: string): string {
  return text.split(" ").slice(1).join(" ").trim();
}

// ── /youtube <query> — play top result immediately ────────────────────────────

composer.command(["youtube", "yt"], async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    await ctx.reply("This command works in groups only.");
    return;
  }
  if (!ctx.from || !("isBot" in ctx.from)) return;

  const query = ctx.message ? cmdArgs(ctx.message.text) : "";
  if (!query) {
    await ctx.reply("Please provide a search keyword.");
    return;
  }
  logger.info(
    `/youtube query="${query}" chatId=${ctx.chat.id} userId=${ctx.from.id}`,
  );
  await ctx.sendChatAction({ type: "typing" });

  const results = await yt.search(query);
  if (!results.length) {
    await ctx.reply("No results found.");
    return;
  }
  const songData = await yt.getSong(results[0]!.id, {
    id: ctx.from.id,
    first_name: ctx.from.firstName,
  });
  await tgcalls.streamOrQueue(
    { id: ctx.chat.id, name: ctx.chat.title },
    songData,
  );
});

// ── /ytsearch <query> — interactive search results ────────────────────────────

composer.command(["ytsearch", "ytsr"], async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    await ctx.reply("This command works in groups only.");
    return;
  }
  if (!ctx.from || !("isBot" in ctx.from)) return;

  const query = ctx.message ? cmdArgs(ctx.message.text) : "";
  if (!query) {
    await ctx.reply("Please provide a search keyword.");
    return;
  }
  logger.info(
    `/ytsearch query="${query}" chatId=${ctx.chat.id} userId=${ctx.from.id}`,
  );
  await ctx.sendChatAction({ type: "typing" });

  const results = (await yt.search(query)).slice(0, 10);
  if (!results.length) {
    await ctx.reply("No results found.");
    return;
  }

  let text = `Search results for <b>${Bun.escapeHTML(query)}</b>\n\n`;
  const rows: InlineKeyboardButton[][] = [];
  let row: InlineKeyboardButton[] = [];
  const userId = ctx.from.id;

  results.forEach((res, i) => {
    const n = i + 1;
    text +=
      `${String(n).padStart(2, "0")}. <b><a href="https://youtu.be/${res.id}">${Bun.escapeHTML(res.title)}</a> (${res.durationFormatted})</b>\n` +
      `By: ${Bun.escapeHTML(res.artist)}\n\n`;
    row.push({
      type: "callbackData",
      text: String(n),
      callbackData: `yt:${userId}:${res.id}`,
    });
    if (n % 5 === 0 || n === results.length) {
      rows.push(row);
      row = [];
    }
  });

  await ctx.reply(text, {
    parseMode: "HTML",
    linkPreview: { type: "input", isDisabled: true },
    replyMarkup: { type: "inlineKeyboard", inlineKeyboard: rows },
  });
});

// ── Callback: yt:<userId>:<videoId> ──────────────────────────────────────────

composer.callbackQuery(/^yt:\d+:[a-zA-Z0-9._-]+/, async (ctx) => {
  const [, ownerId, videoId] = ctx.callbackQuery.data.split(":");
  if (ctx.callbackQuery.from.id !== Number(ownerId)) {
    await ctx.answerCallbackQuery({
      text: "This isn't your search.",
      isAlert: true,
    });
    return;
  }
  if (!ctx.chat || !("title" in ctx.chat) || !videoId) return;

  logger.info(
    `yt callback videoId=${videoId} chatId=${ctx.chat.id} userId=${ctx.callbackQuery.from.id}`,
  );
  const songData = await yt.getSong(videoId, {
    id: ctx.callbackQuery.from.id,
    first_name: ctx.callbackQuery.from.firstName,
  });
  await tgcalls.streamOrQueue(
    { id: ctx.chat.id, name: ctx.chat.title },
    songData,
  );
  await ctx.delete();
});

export default composer;
