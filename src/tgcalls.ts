/**
 * TGVCCalls — orchestrates the NTgCalls WebRTC flow per chat.
 *
 * Stream flow for each new track:
 *   1. ntgCalls.create(chatId)                → WebRTC offer JSON
 *   2. userbot.startVideoChat(chatId)          → start VC if not already active
 *   3. userbot.joinVideoChat(vcId, offer)      → server answer JSON
 *   4. ntgCalls.connect(chatId, answer)        → WebRTC handshake complete
 *   5. ntgCalls.setAudioSource(chatId, cmd)    → audio begins flowing
 *
 * On "stream-end":
 *   - Pop next from queue and play, or leave VC + stop NTgCalls if empty.
 */

import { errors } from "@mtkruto/node";
import { YtdlCore } from "@ybd-project/ytdl-core";
import { consola } from "consola";
import { bot, log, userbot } from "./clients";
import { buildFfmpegCmd } from "./ffmpeg";
import { ntgCalls } from "./ntgcalls";
import { type QueueData, queue } from "./queue";

const logger = consola.withTag("tgcalls");

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatInfo {
  id: number;
  name: string;
}

// ── TGVCCalls class ───────────────────────────────────────────────────────────

class TGVCCalls {
  /** chatId → video-chat id (the string id used by MTKruto VC methods) */
  private readonly vcIds = new Map<number, string>();

  /** Cache group chat names for log formatting */
  private readonly chatNames = new Map<number, string>();

  /** chatIds currently connected via NTgCalls */
  private readonly active = new Set<number>();

  constructor() {
    ntgCalls.on("stream-end", (chatId: number) => {
      this.onStreamEnd(chatId).catch((e) =>
        logger.error("Stream-end handler error", e),
      );
    });
  }

  // ── Public state queries ────────────────────────────────────────────────────

  isActive(chatId: number): boolean {
    return this.active.has(chatId);
  }

  // ── Core playback ───────────────────────────────────────────────────────────

  /**
   * Play `data` immediately, or push it to the queue if already streaming.
   * Pass `force = true` to replace the current track (used by skip).
   */
  async streamOrQueue(
    chat: ChatInfo,
    data: QueueData,
    force = false,
  ): Promise<void> {
    this.chatNames.set(chat.id, chat.name);

    if (this.isActive(chat.id) && !force) {
      const position = queue.push(chat.id, data);
      await bot.sendMessage(
        chat.id,
        `<a href="${data.link}">${Bun.escapeHTML(data.title)}</a> queued at position ${position} by <a href="tg://user?id=${data.requestedBy.id}">${Bun.escapeHTML(data.requestedBy.first_name)}</a>`,
        { parseMode: "HTML", linkPreview: { type: "input", isDisabled: true } },
      );
      return;
    }

    await this.play(chat, data);
  }

  /** Pause the current stream. Returns false if not active. */
  async pause(chatId: number): Promise<boolean> {
    if (!this.isActive(chatId)) return false;
    await ntgCalls.pause(chatId);
    return true;
  }

  /** Resume a paused stream. Returns false if not active. */
  async resume(chatId: number): Promise<boolean> {
    if (!this.isActive(chatId)) return false;
    await ntgCalls.resume(chatId);
    return true;
  }

  /** Skip the current track. */
  async skip(chatId: number): Promise<boolean> {
    if (!this.isActive(chatId)) return false;

    // Pop the next track from the queue
    const next = queue.pop(chatId);

    if (next) {
      // Play the next track (will hot-swap seamlessly)
      const chatName = this.chatNames.get(chatId) ?? String(chatId);
      await this.play({ id: chatId, name: chatName }, next);
    } else {
      // No more tracks in queue — stop calls, clear current, and leave VC
      await this.stop(chatId);
    }

    return true;
  }

  /** Stop everything, clear queue, leave VC. */
  async stop(chatId: number): Promise<boolean> {
    if (!this.isActive(chatId)) return false;
    queue.clear(chatId);
    queue.clearCurrent(chatId);
    await this.teardown(chatId);
    return true;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Resolve the ffmpeg command for a track based on its provider.
   * YouTube requires a fresh stream URL from ytdl; all others use mp3_link directly.
   */
  private async resolveFfmpegCmd(
    data: QueueData,
    chatId: number,
  ): Promise<string> {
    switch (data.provider) {
      case "youtube": {
        const ytdl = new YtdlCore({ disablePoTokenAutoGeneration: true });
        const info = await ytdl.getFullInfo(
          `https://www.youtube.com/watch?v=${data.mp3_link}`,
        );
        // Prefer opus (itag 251) for best quality; fall back to first format
        const audio =
          info.formats.find((f) => f.itag === 251) ?? info.formats[0];
        if (!audio?.url)
          throw new Error("No audio format found for YouTube video");
        return buildFfmpegCmd(audio.url);
      }
      case "telegram": {
        // mp3_link is a file_id — download to a temp file then pass path to ffmpeg
        const chunks: Uint8Array[] = [];
        for await (const chunk of bot.download(data.mp3_link)) {
          chunks.push(chunk);
        }
        const tmpPath = `/tmp/tgvc_${chatId}_${Date.now()}.audio`;
        await Bun.write(tmpPath, Buffer.concat(chunks));
        return buildFfmpegCmd(tmpPath);
      }
      // "jiosaavn" | "radio" — mp3_link is a direct URL
      default:
        return buildFfmpegCmd(data.mp3_link);
    }
  }

  /**
   * Full WebRTC setup + audio start for one track.
   */
  private async play(chat: ChatInfo, data: QueueData): Promise<void> {
    try {
      // 1. Resolve ffmpeg command (may involve network calls)
      const ffmpegCmd = await this.resolveFfmpegCmd(data, chat.id);

      if (this.isActive(chat.id)) {
        // Hot-swap the audio source instantly without resetting WebRTC connection
        await ntgCalls.setAudioSource(chat.id, ffmpegCmd);
        queue.setCurrent(chat.id, data);

        // Send now-playing message (best-effort)
        await this.sendPlayingMessage(chat, data);

        logger.info(`[${chat.name}] Playing (Hot-Swapped) — ${data.title}`);
        return;
      }

      // 2. Generate WebRTC offer
      const offer = await ntgCalls.create(chat.id);
      logger.debug(`[${chat.name}] WebRTC offer created`);

      // 3. Ensure VC is running and we have its id
      const vcId = await this.ensureVcId(chat.id);
      logger.debug(`[${chat.name}] Joining vcId=${vcId}`);

      // 4. Join VC with the offer → get server answer.
      // Telegram occasionally returns transient errors even when the join succeeds.
      // On failure: stop ntgcalls, bust the vcId cache, wait, then retry with a
      // fresh offer — reusing a stale SSRC causes repeated rejections.
      const isRetryableJoinError = (e: unknown) =>
        e instanceof errors.GroupcallAddParticipantsFailed ||
        (e instanceof errors.TelegramError && e.errorCode === -503);
      let answer: string;
      try {
        answer = await userbot.joinVideoChat(vcId, offer, {
          isAudioEnabled: true,
          isVideoEnabled: false,
        });
      } catch (err) {
        if (isRetryableJoinError(err)) {
          logger.warn(
            `[${chat.name}] Join failed, retrying with fresh offer — ${err}`,
          );
          await new Promise((r) => setTimeout(r, 2000));
          try {
            await ntgCalls.stop(chat.id);
          } catch {
            /* ignore */
          }
          this.vcIds.delete(chat.id);
          const freshOffer = await ntgCalls.create(chat.id);
          const freshVcId = await this.ensureVcId(chat.id);
          answer = await userbot.joinVideoChat(freshVcId, freshOffer, {
            isAudioEnabled: true,
            isVideoEnabled: false,
          });
        } else {
          throw err;
        }
      }

      // 5. Complete WebRTC handshake
      await ntgCalls.connect(chat.id, answer);

      // 6. Start audio
      await ntgCalls.setAudioSource(chat.id, ffmpegCmd);

      this.active.add(chat.id);
      queue.setCurrent(chat.id, data);

      // 7. Send now-playing message (best-effort)
      await this.sendPlayingMessage(chat, data);

      logger.info(`[${chat.name}] Playing — ${data.title}`);
    } catch (err) {
      logger.error(`[${chat.name}] Failed to play "${data.title}"`, err);
      await log(`[Error][${chat.name}] ${Bun.escapeHTML(String(err))}`);
      // Attempt to advance queue even on error
      await this.onStreamEnd(chat.id);
    }
  }

  /**
   * Get the video chat id for a chat, starting one if none is active.
   */
  private async ensureVcId(chatId: number): Promise<string> {
    // Check our cache first
    const cached = this.vcIds.get(chatId);
    if (cached) return cached;

    // Check if there's already an active VC via getChat
    const chatInfo = await userbot.getChat(chatId);
    if (
      (chatInfo.type === "group" ||
        chatInfo.type === "supergroup" ||
        chatInfo.type === "channel") &&
      chatInfo.videoChatId
    ) {
      logger.debug(`[${chatId}] Found existing vcId=${chatInfo.videoChatId}`);
      this.vcIds.set(chatId, chatInfo.videoChatId);
      return chatInfo.videoChatId;
    }

    // No active VC — start one
    logger.debug(`[${chatId}] No active VC, starting one`);
    const vc = await userbot.startVideoChat(chatId);
    this.vcIds.set(chatId, vc.id);
    return vc.id;
  }

  /**
   * Called when NTgCalls signals the current stream has ended.
   * Advances to the next queued track, or tears down if empty.
   */
  private async onStreamEnd(chatId: number): Promise<void> {
    const next = queue.pop(chatId);
    const chatName = this.chatNames.get(chatId) ?? String(chatId);
    if (next) {
      logger.debug(`[${chatName}] Advancing to next: "${next.title}"`);
      await this.play({ id: chatId, name: chatName }, next);
    } else {
      logger.info(`[${chatName}] Queue exhausted, leaving voice chat`);
      queue.clearCurrent(chatId);
      await this.teardown(chatId);
    }
  }

  /**
   * Stop NTgCalls for a chat and leave the voice chat.
   */
  private async teardown(chatId: number): Promise<void> {
    const chatName = this.chatNames.get(chatId) ?? String(chatId);
    logger.debug(`[${chatName}] Tearing down`);
    this.active.delete(chatId);
    const vcId = this.vcIds.get(chatId);
    this.vcIds.delete(chatId);

    try {
      await ntgCalls.stop(chatId);
    } catch {
      // already stopped
    }

    if (vcId) {
      try {
        await userbot.leaveVideoChat(vcId);
      } catch (err) {
        logger.warn(
          `[${chatName}] Failed to leave voice chat (may have already left) — ${err}`,
        );
      }
    }
  }

  /**
   * Send the "Now Playing" message with banner image if possible.
   */
  private async sendPlayingMessage(
    chat: ChatInfo,
    data: QueueData,
  ): Promise<void> {
    const caption =
      `Playing <a href="${data.link}">${Bun.escapeHTML(data.title)}</a>\n` +
      `<b>▸</b> Artist: ${Bun.escapeHTML(data.artist)}\n` +
      `<b>▸</b> Duration: ${data.duration}\n` +
      `<b>▸</b> Requested by <a href="tg://user?id=${data.requestedBy.id}">${Bun.escapeHTML(data.requestedBy.first_name)}</a>`;

    try {
      // Dynamic import avoids circular deps; banner module created in Phase 7
      const { generateBanner } = await import("./utils/banner");
      const banner = await generateBanner({
        image: data.image,
        artist: data.artist,
        title: data.title,
      });
      await bot.sendPhoto(chat.id, banner, {
        caption,
        parseMode: "HTML",
      });
    } catch {
      // Banner failed — fall back to plain text
      await bot.sendMessage(chat.id, caption, {
        parseMode: "HTML",
        linkPreview: { type: "input", isDisabled: true },
      });
    }
  }
}

export const tgcalls = new TGVCCalls();
