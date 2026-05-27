/**
 * FFmpeg utilities.
 *
 * NTgCalls runs ffmpeg itself (NTG_SHELL mode) — we just need to build the
 * shell command string it will execute.  The command must write raw PCM to
 * stdout: signed 16-bit little-endian, 48 kHz, mono.
 */

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

/**
 * Check that ffmpeg is available in PATH.  Exits the process if not found.
 * Call once at startup before any streams are attempted.
 */
export function testFFMPEG(): void {
  if (!Bun.which("ffmpeg")) {
    console.error(
      "[Error] ffmpeg not found in PATH.\n" +
        "Install it (e.g. `apt install ffmpeg` / `brew install ffmpeg`) and restart.",
    );
    process.exit(1);
  }
}
