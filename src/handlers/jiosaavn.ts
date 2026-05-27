import { Composer, type InlineKeyboardButton } from "@mtkruto/node";
import { jiosaavn } from "../providers/jiosaavn";
import { tgcalls } from "../tgcalls";

const composer = new Composer();

function cmdArgs(text: string): string {
  return text.split(" ").slice(1).join(" ").trim();
}

// ── /jiosaavn <query> — play top result immediately ───────────────────────────

composer.command(["jiosaavn", "jsvn"], async (ctx) => {
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
  await ctx.sendChatAction({ type: "typing" });

  const results = await jiosaavn.search(query);
  if (!results.length) {
    await ctx.reply("No results found.");
    return;
  }
  const songData = await jiosaavn.getSong(results[0]!.id, {
    id: ctx.from.id,
    first_name: ctx.from.firstName,
  });
  await tgcalls.streamOrQueue(
    { id: ctx.chat.id, name: ctx.chat.title },
    songData,
  );
});

// ── /jsvnsearch <query> — interactive search results ─────────────────────────

composer.command(["jsvnsearch", "jiosaavnsearch", "jsvnsr"], async (ctx) => {
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
  await ctx.sendChatAction({ type: "typing" });

  const results = (await jiosaavn.search(query)).slice(0, 10);
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
    const singers = res.artists.primary.map((a) => a.name).join(", ");
    text +=
      `${String(n).padStart(2, "0")}. <b><a href="${res.url}">${Bun.escapeHTML(res.name)}</a></b>\n` +
      `By: ${Bun.escapeHTML(singers)}\n\n`;
    row.push({
      type: "callbackData",
      text: String(n),
      callbackData: `jsvn:${userId}:${res.id}`,
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

// ── Callback: jsvn:<userId>:<songId> ─────────────────────────────────────────

composer.callbackQuery(/^jsvn:\d+:[a-zA-Z0-9._-]+/, async (ctx) => {
  const [, ownerId, songId] = ctx.callbackQuery.data.split(":");
  if (ctx.callbackQuery.from.id !== Number(ownerId)) {
    await ctx.answerCallbackQuery({
      text: "This isn't your search.",
      isAlert: true,
    });
    return;
  }
  if (!ctx.chat || !("title" in ctx.chat) || !songId) return;

  const songData = await jiosaavn.getSong(songId, {
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
