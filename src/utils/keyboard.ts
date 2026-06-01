import type {
  InlineKeyboardButton,
  ReplyMarkupInlineKeyboard,
} from "@mtkruto/node";
import { bot } from "../clients";
import env from "../env";

/** Cached bot username so we don't call getMe() on every message. */
let cachedUsername: string | undefined;

async function botUsername(): Promise<string | undefined> {
  if (cachedUsername) return cachedUsername;
  const me = await bot.getMe();
  cachedUsername = me.username ?? undefined;
  return cachedUsername;
}

/**
 * Build the inline keyboard with the "Open Stream Controller" Mini App button.
 *
 * Uses a t.me/<bot>/<short-name>?startapp=<chatId> deep link (works in groups,
 * no domain whitelist needed). Returns undefined when WEBAPP_SHORT_NAME is not
 * configured or the bot username can't be resolved, so callers can spread the
 * result and silently omit the button.
 */
export async function controllerKeyboard(
  chatId: number,
): Promise<ReplyMarkupInlineKeyboard | undefined> {
  if (!env.WEBAPP_SHORT_NAME) return undefined;
  const username = await botUsername();
  if (!username) return undefined;

  // startapp params must be alphanumeric/_/-; encode the leading group "-" as "g".
  const chatIdParam = chatId.toString().replace(/^-/, "g");
  const button: InlineKeyboardButton = {
    type: "url",
    text: "🎵 Open Stream Controller",
    url: `https://t.me/${username}/${env.WEBAPP_SHORT_NAME}?startapp=${chatIdParam}`,
  };

  return { type: "inlineKeyboard", inlineKeyboard: [[button]] };
}
