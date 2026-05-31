import { Composer } from "@mtkruto/node";

const composer = new Composer();

composer.command("start", async (ctx) => {
  if (!ctx.from || !("isBot" in ctx.from)) return;
  const name = Bun.escapeHTML(ctx.from.firstName);
  await ctx.reply(
    `Hi <a href="tg://user?id=${ctx.from.id}">${name}</a>\n` +
      `I play songs in Telegram voice chats.\n` +
      `If you like this bot, consider starring the <a href="https://github.com/ArnabXD/TGVCBot">repository</a> ★`,
    {
      parseMode: "HTML",
      linkPreview: { type: "input", isDisabled: true },
      replyMarkup: {
        type: "inlineKeyboard",
        inlineKeyboard: [
          [
            {
              type: "url",
              text: "View Source",
              url: "https://github.com/ArnabXD/TGVCBot",
            },
          ],
        ],
      },
    },
  );
});

export default composer;
