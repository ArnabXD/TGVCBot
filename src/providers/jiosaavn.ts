import type { QueueData } from "../queue";
import StreamProvider, { type RequestedBy } from "./base";

// ── API types ─────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  title: string;
  image: string;
  more_info: { singers: string };
  perma_url: string;
}

interface SearchResponse {
  results: SearchResult[];
}

interface SongResponse {
  song: string;
  singers: string;
  primary_artists: string;
  image: string;
  duration: string;
  perma_url: string;
  media_urls: Record<string, string>;
  media_url: string;
}

// ── Provider ──────────────────────────────────────────────────────────────────

class JioSaavn extends StreamProvider {
  private readonly base = "https://jsvn-tgvc.vercel.app";

  constructor() {
    super("jiosaavn");
  }

  async search(key: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ query: key.replace(/\s/g, "+") });
    const res = await fetch(`${this.base}/search?${params}`);
    if (!res.ok) return [];
    const data = (await res.json()) as SearchResponse;
    return (data.results ?? []).map((r) => ({
      ...r,
      title: r.title.replace(/&quot;/g, `"`),
    }));
  }

  async getSong(id: string, from: RequestedBy): Promise<QueueData> {
    const res = await fetch(`${this.base}/song?id=${id}`);
    if (!res.ok) throw new Error(`JioSaavn getSong failed: ${res.status}`);
    const song = (await res.json()) as SongResponse;
    return {
      link: song.perma_url,
      title: song.song.replace(/&quot;/g, `"`),
      image: song.image,
      artist: song.singers || song.primary_artists,
      duration: song.duration,
      requestedBy: { id: from.id, first_name: from.first_name },
      mp3_link: song.media_urls["96_KBPS"] ?? song.media_url,
      provider: this.provider,
    };
  }
}

export const jiosaavn = new JioSaavn();
