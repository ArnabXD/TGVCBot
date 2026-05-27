/**
 * Device fingerprint passed to Telegram's initConnection.
 *
 * Using real Telegram Desktop values so the session looks like a normal
 * desktop client and is less likely to be flagged for suspicious activity.
 */

import type { ClientParams } from "@mtkruto/node";

export const deviceConfig = {
  deviceModel: "Desktop",
  systemVersion: "Windows 10",
  appVersion: "5.3.2 x64",
  systemLangCode: "en-US",
} satisfies Partial<ClientParams>;
