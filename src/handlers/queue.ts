import { Composer } from "@mtkruto/node";
import { queue } from "../queue";

const composer = new Composer();

composer.command(["queue", "q"], async (ctx) => {
  if (!ctx.chat) return;
  const items = queue.getAll(ctx.chat.id);
  if (!items.length) {
    await ctx.reply("Queue is empty.");
    return;
  }

  let text = `<b><i>Queue (${items.length} track${items.length === 1 ? "" : "s"}):</i></b>\n\n`;
  for (const [i, d] of items.entries()) {
    text +=
      `<b>${i + 1}.</b> <a href="${d.link}">${Bun.escapeHTML(d.title)}</a>\n` +
      `Requested by <a href="tg://user?id=${d.requestedBy.id}">${Bun.escapeHTML(d.requestedBy.first_name)}</a>\n\n`;
  }

  await ctx.reply(text, {
    parseMode: "HTML",
    linkPreview: { type: "input", isDisabled: true },
  });
});

export default composer;
