import { Composer } from "@mtkruto/node";
import { consola } from "consola";
import env from "../env";
import { tgcalls } from "../tgcalls";

const logger = consola.withTag("handler:radio");

const composer = new Composer();

function cmdArgs(text: string): string {
  return text.split(" ").slice(1).join(" ").trim();
}

composer.command(["radio", "stream"], async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    await ctx.reply("This command works in groups only.");
    return;
  }
  if (!ctx.from || !("isBot" in ctx.from)) {
    await ctx.reply("Could not identify sender.");
    return;
  }

  const url = ctx.message ? cmdArgs(ctx.message.text) : "";
  if (!url) {
    await ctx.reply(
      "Please provide a stream URL.\nExample: /radio https://radio.example.com/stream",
    );
    return;
  }
  if (!url.startsWith("http")) {
    await ctx.reply("Invalid URL — must start with http or https.");
    return;
  }

  logger.info(
    `/radio url="${url}" chatId=${ctx.chat.id} userId=${ctx.from.id}`,
  );
  await ctx.sendChatAction({ type: "uploadingPhoto" });

  // After the private guard above, ctx.chat is ChatPGroup | ChatPSupergroup | ChatPChannel,
  // all of which have a title field.
  const chatName = ctx.chat.title;
  await tgcalls.streamOrQueue(
    { id: ctx.chat.id, name: chatName },
    {
      link: url,
      title: "Radio",
      image: env.THUMBNAIL,
      artist: "Live Stream",
      duration: "∞",
      requestedBy: { id: ctx.from.id, first_name: ctx.from.firstName },
      mp3_link: url,
      provider: "radio",
    },
  );
});

export default composer;
