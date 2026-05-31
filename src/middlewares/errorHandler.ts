import { consola } from "consola";
import { log } from "../clients";

const logger = consola.withTag("errorHandler");

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
    logger.error("Failed to report error", e);
  }
}
