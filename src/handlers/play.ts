import { Composer } from "@mtkruto/node";
import { consola } from "consola";
import env from "../env";
import { tgcalls } from "../tgcalls";
import { controllerKeyboard } from "../utils/keyboard";

const logger = consola.withTag("handler:play");

const composer = new Composer();

/** Build a t.me/c/... message link for a group message. */
function messageLink(chatId: number, messageId: number): string {
  const id = chatId.toString();
  const normalized = id.startsWith("-100") ? id.slice(4) : id.slice(1);
  return `https://t.me/c/${normalized}/${messageId}`;
}

composer.command(["play", "pl"], async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    await ctx.reply("This command works in groups only.");
    return;
  }
  if (!ctx.from || !("isBot" in ctx.from)) {
    await ctx.reply("Could not identify sender.");
    return;
  }

  const replied = ctx.message?.replyToMessage;
  if (!replied || replied.type !== "audio") {
    const replyMarkup = await controllerKeyboard(ctx.chat.id);
    if (replyMarkup) {
      await ctx.reply(
        "🎵 <b>TGVCBot Stream Controller</b>\n\n" +
          "Click the button below to search for songs, view the queue, and control the active stream!",
        { parseMode: "HTML", replyMarkup },
      );
      return;
    }
    await ctx.reply("Please reply to an audio file with this command.");
    return;
  }

  logger.info(
    `/play fileId=${replied.audio.fileId} chatId=${ctx.chat.id} userId=${ctx.from.id}`,
  );
  await ctx.sendChatAction({ type: "uploadingPhoto" });

  const audio = replied.audio;
  const thumbnail = audio.thumbnails[0]?.fileId ?? env.THUMBNAIL;
  // After the private guard above, ctx.chat is ChatPGroup | ChatPSupergroup | ChatPChannel,
  // all of which have a title field.
  const chatName = ctx.chat.title;

  await tgcalls.streamOrQueue(
    { id: ctx.chat.id, name: chatName },
    {
      title: audio.title ?? "Unknown",
      duration: String(audio.duration),
      image: thumbnail,
      artist: audio.performer ?? "TGVCBot",
      link: messageLink(ctx.chat.id, replied.id),
      mp3_link: audio.fileId,
      provider: "telegram",
      requestedBy: { id: ctx.from.id, first_name: ctx.from.firstName },
    },
  );
});

export default composer;
