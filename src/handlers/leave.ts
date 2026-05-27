import { Composer } from "@mtkruto/node";
import { userbot } from "../clients";
import { tgcalls } from "../tgcalls";

const composer = new Composer();

composer.command("leave", async (ctx) => {
  if (!ctx.chat || ctx.chat.type === "private") {
    await ctx.reply("This command works in groups only.");
    return;
  }
  if (tgcalls.isActive(ctx.chat.id)) {
    await ctx.reply("Stream is still active. Use /stopvc to stop it first.");
    return;
  }
  // Fetch current VC id from Telegram and leave it
  try {
    const chat = await userbot.getChat(ctx.chat.id);
    if (
      (chat.type === "group" ||
        chat.type === "supergroup" ||
        chat.type === "channel") &&
      chat.videoChatId
    ) {
      await userbot.leaveVideoChat(chat.videoChatId);
      await ctx.reply("Left the voice chat.");
    } else {
      await ctx.reply("No active voice chat found.");
    }
  } catch (err) {
    await ctx.reply(`Failed to leave: ${Bun.escapeHTML(String(err))}`);
  }
});

export default composer;
