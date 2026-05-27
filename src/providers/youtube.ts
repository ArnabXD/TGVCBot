import { YouTube as YtSr } from "youtube-sr";
import env from "../env";
import type { QueueData } from "../queue";
import StreamProvider, { type RequestedBy } from "./base";

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
    return results.map((r) => ({
      id: r.id ?? "dQw4w9WgXcQ",
      title: r.title ?? "Unknown",
      artist: r.channel?.name ?? "Unknown",
      durationFormatted: r.durationFormatted,
    }));
  }

  async getSong(id: string, from: RequestedBy): Promise<QueueData> {
    const song = await YtSr.searchOne(id);
    return {
      link: song.url,
      title: song.title ?? "Unknown",
      image: song.thumbnail?.url ?? env.THUMBNAIL,
      artist: song.channel?.name ?? "Unknown",
      duration: song.durationFormatted,
      requestedBy: { id: from.id, first_name: from.first_name },
      mp3_link: song.id ?? "dQw4w9WgXcQ",
      provider: this.provider,
    };
  }
}

export const yt = new YouTube();
