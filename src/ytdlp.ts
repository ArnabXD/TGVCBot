/**
 * YouTube stream-URL resolution via the yt-dlp CLI.
 *
 * @ybd-project/ytdl-core was removed: as of June 2026 every client it
 * supports gets HTTP 403 from googlevideo (unsolved n-sig/poToken
 * challenges), and 6.0.8 is its latest release. yt-dlp keeps its extractor
 * current, so we shell out to it instead. Keep the host binary updated
 * (`yt-dlp -U`) — YouTube playback breaking again usually means it's stale.
 */

import { consola } from "consola";

const logger = consola.withTag("ytdlp");

/** How long a single yt-dlp resolution may take before we kill it. */
const RESOLVE_TIMEOUT_MS = 60_000;

export interface YouTubeStreamUrls {
  audioUrl: string;
  /** Present only when video was requested and a stream was found. */
  videoUrl?: string;
}

/**
 * Resolve direct googlevideo URLs for a video id.
 *
 * With `withVideo`, requests `bestvideo[height<=720]+bestaudio` — yt-dlp -g
 * then prints two lines in format-spec order (video first, audio second).
 * If it falls back to a single muxed format, the one URL serves as both.
 */
export async function resolveYouTubeUrls(
  videoId: string,
  withVideo: boolean,
): Promise<YouTubeStreamUrls> {
  const format = withVideo
    ? "bestvideo[height<=720]+bestaudio/best[height<=720]/best"
    : "bestaudio/best";

  const proc = Bun.spawn(
    [
      "yt-dlp",
      "-g",
      "--no-playlist",
      "-f",
      format,
      `https://www.youtube.com/watch?v=${videoId}`,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const killer = setTimeout(() => proc.kill(), RESOLVE_TIMEOUT_MS);

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(killer);

  if (exitCode !== 0) {
    const reason =
      stderr.split("\n").find((l) => l.startsWith("ERROR:")) ??
      stderr.trim().slice(0, 200);
    throw new Error(`yt-dlp failed for ${videoId}: ${reason}`);
  }

  const urls = stdout.trim().split("\n").filter(Boolean);
  if (!urls.length) throw new Error(`yt-dlp returned no URLs for ${videoId}`);

  if (!withVideo) return { audioUrl: urls[0]! };
  // Two lines: video then audio. One line: muxed format carrying both.
  return urls.length >= 2
    ? { audioUrl: urls[1]!, videoUrl: urls[0]! }
    : { audioUrl: urls[0]!, videoUrl: urls[0]! };
}

/**
 * Warn at startup when yt-dlp is missing — YouTube playback won't work, but
 * the other providers don't need it, so this is not fatal (unlike ffmpeg).
 */
export function testYtDlp(): void {
  if (!Bun.which("yt-dlp")) {
    logger.error(
      "yt-dlp not found in PATH — YouTube playback will fail. Install it (e.g. `pip install yt-dlp`) and keep it updated with `yt-dlp -U`.",
    );
  }
}
