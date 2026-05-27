import type { Context, MiddlewareFn } from "@mtkruto/node";
import { tgcalls } from "../tgcalls";

/**
 * Guard middleware for commands that require an active voice chat stream.
 * Rejects private chats and chats without a live stream.
 */
export const checkInactiveVc: MiddlewareFn<Context> = async (ctx, next) => {
  if (!ctx.chat) return;
  if (ctx.chat.type === "private") {
    await ctx.reply("This command works in groups only.");
    return;
  }
  if (!tgcalls.isActive(ctx.chat.id)) {
    await ctx.reply("No active stream.");
    return;
  }
  await next();
};
