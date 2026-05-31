import { log } from "../clients";

/**
 * Top-level error handler — logs to LOG_CHANNEL and replies to the user.
 * Attach with bot.use(errorHandler) before all other middleware.
 */
export async function errorHandler(
  err: unknown,
  // biome-ignore lint/suspicious/noExplicitAny: grammY-style error objects vary
  ctx: any,
): Promise<void> {
  if (!err) return;
  try {
    const msg = Bun.escapeHTML(String(err));
    await log(`[Error] ${msg}`);
    await ctx?.reply?.(`✖ Something went wrong:\n<code>${msg}</code>`, {
      parseMode: "HTML",
    });
  } catch (e) {
    console.error("[errorHandler] failed to report error:", e);
  }
}
