import crypto from "node:crypto";
import env from "../env";

export interface WebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface ValidatedInitData {
  query_id?: string;
  user: WebAppUser;
  auth_date: number;
  hash: string;
}

/**
 * Validates Telegram Mini App initData string.
 * @param initData The raw initData query string sent in headers.
 * @returns The parsed ValidatedInitData or null if signature is invalid.
 */
export function validateInitData(
  initData: string | null | undefined,
): ValidatedInitData | null {
  if (!initData) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    // Sort parameters alphabetically (except hash)
    const sortedKeys = Array.from(params.keys())
      .filter((k) => k !== "hash")
      .sort();

    const dataCheckString = sortedKeys
      .map((k) => `${k}=${params.get(k)}`)
      .join("\n");

    // Secret key = HMAC-SHA256(key = "WebAppData", data = BOT_TOKEN)
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(env.BOT_TOKEN)
      .digest();

    // Computed hash = HMAC-SHA256(key = secretKey, data = dataCheckString)
    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (computedHash !== hash) {
      return null;
    }

    // Verify age (avoid replay attacks, e.g. within 24 hours)
    const authDate = Number(params.get("auth_date") || 0);
    const now = Math.floor(Date.now() / 1000);
    // Allow up to 24 hours of skew
    if (Math.abs(now - authDate) > 86400) {
      return null;
    }

    const userJson = params.get("user");
    if (!userJson) return null;

    const user = JSON.parse(userJson) as WebAppUser;

    return {
      query_id: params.get("query_id") || undefined,
      user,
      auth_date: authDate,
      hash,
    };
  } catch (_err) {
    return null;
  }
}
