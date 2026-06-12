import { consola } from "consola";
import { decode } from "he";
import { YouTube as YtSr } from "youtube-sr";
import env from "../env";
import type { QueueData } from "../queue";
import StreamProvider, { type RequestedBy } from "./base";

const logger = consola.withTag("youtube");

// ── URL parsing ───────────────────────────────────────────────────────────────

const YT_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extract a YouTube video id from a URL.
 * Supports youtube.com/watch?v=, youtu.be/, Shorts, embed, live and
 * music.youtube.com links. Returns null when `text` isn't a YouTube URL.
 */
export function extractYouTubeId(text: string): string | null {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www|m)\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/")[1] ?? "";
    return YT_VIDEO_ID.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "music.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && YT_VIDEO_ID.test(v)) return v;
    const match = url.pathname.match(
      /^\/(?:shorts|embed|live|v)\/([a-zA-Z0-9_-]{11})(?:[/?]|$)/,
    );
    return match?.[1] ?? null;
  }
  return null;
}

// ── Search result shape used by handlers ──────────────────────────────────────

export interface YtSearchResult {
  id: string;
  title: string;
  artist: string;
  durationFormatted: string;
}

// ── Provider ──────────────────────────────────────────────────────────────────

class YouTube extends StreamProvider {
  constructor() {
    super("youtube");
  }

  async search(key: string): Promise<YtSearchResult[]> {
    const results = await YtSr.search(key, {
      type: "video",
      limit: 10,
      safeSearch: true,
    });
    if (!results.length)
      logger.warn(`Search returned no results for query="${key}"`);
    return results.map((r) => ({
      id: r.id ?? "dQw4w9WgXcQ",
      title: decode(r.title ?? "Unknown"),
      artist: decode(r.channel?.name ?? "Unknown"),
      durationFormatted: r.durationFormatted,
    }));
  }

  async getSong(id: string, from: RequestedBy): Promise<QueueData> {
    const song = await YtSr.searchOne(id);
    return {
      link: song.url,
      title: decode(song.title ?? "Unknown"),
      image: song.thumbnail?.url ?? env.THUMBNAIL,
      artist: decode(song.channel?.name ?? "Unknown"),
      duration: song.durationFormatted,
      requestedBy: { id: from.id, first_name: from.first_name },
      mp3_link: song.id ?? "dQw4w9WgXcQ",
      provider: this.provider,
    };
  }
}

export const yt = new YouTube();
