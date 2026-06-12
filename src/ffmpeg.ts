/**
 * FFmpeg utilities.
 *
 * NTgCalls runs ffmpeg itself (NTG_SHELL mode) — we just need to build the
 * shell command string it will execute.  The command must write raw PCM to
 * stdout: signed 16-bit little-endian, 48 kHz, mono.
 */

import { consola } from "consola";

const logger = consola.withTag("ffmpeg");

/**
 * Build the ffmpeg shell command for a given input.
 *
 * @param input  URL, file path, or any string ffmpeg accepts as `-i`.
 *               Surround with quotes so spaces in paths are handled by the
 *               shell that NTgCalls spawns.
 */
export function buildFfmpegCmd(input: string): string {
  // -vn        — drop video streams (saves decode work)
  // -f s16le   — raw PCM output format (signed 16-bit little-endian)
  // -ar 48000  — sample rate required by Telegram voice chats
  // -ac 1      — mono (NTgCalls default; stereo wastes bandwidth)
  // -          — write to stdout
  return `ffmpeg -loglevel quiet -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5 -i "${input}" -vn -f s16le -ar 48000 -ac 1 -`;
}

// Fixed output canvas for video streams. ntgcalls reads rawvideo frames and
// needs their dimensions declared up front, so every source is scaled+padded
// to this exact size (see buildFfmpegVideoCmd). 720p30 balances quality
// against the CPU cost of rawvideo decode on the host.
export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;
export const VIDEO_FPS = 30;

/**
 * Build the ffmpeg shell command producing raw video frames for ntgcalls.
 *
 * Output: rawvideo, yuv420p, exactly VIDEO_WIDTH×VIDEO_HEIGHT at VIDEO_FPS —
 * the frame size MUST match the dimensions declared in the camera
 * VideoDescription or ntgcalls misreads the frame boundaries. Sources with a
 * different aspect ratio are letterboxed via scale+pad.
 */
export function buildFfmpegVideoCmd(input: string): string {
  const vf =
    `scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,` +
    `pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2,` +
    `fps=${VIDEO_FPS},format=yuv420p`;
  return `ffmpeg -loglevel quiet -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5 -i "${input}" -an -f rawvideo -pix_fmt yuv420p -vf "${vf}" -`;
}

/**
 * Check that ffmpeg is available in PATH.  Exits the process if not found.
 * Call once at startup before any streams are attempted.
 */
export function testFFMPEG(): void {
  if (!Bun.which("ffmpeg")) {
    logger.fatal(
      "ffmpeg not found in PATH. Install it (e.g. `apt install ffmpeg` / `brew install ffmpeg`) and restart.",
    );
    process.exit(1);
  }
}
