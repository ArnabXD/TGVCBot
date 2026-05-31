import { consola } from "consola";
import type { QueueData } from "../queue";
import StreamProvider, { type RequestedBy } from "./base";

const logger = consola.withTag("jiosaavn");

// ── API types (saavn.sumit.co / saavn.dev schema) ─────────────────────────────

interface QualityUrl {
  quality: string;
  url: string;
}

interface Artist {
  name: string;
}

interface SearchResult {
  id: string;
  name: string;
  url: string;
  duration: number | null;
  artists: { primary: Artist[] };
  image: QualityUrl[];
  downloadUrl: QualityUrl[];
}

interface SearchResponse {
  success: boolean;
  data: { results: SearchResult[] };
}

interface SongResponse {
  success: boolean;
  data: SearchResult[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bestDownloadUrl(urls: QualityUrl[]): string | undefined {
  // Prefer 160kbps, fall back to highest available
  return (
    urls.find((u) => u.quality === "160kbps")?.url ??
    urls.find((u) => u.quality === "96kbps")?.url ??
    urls.at(-1)?.url
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "Unknown";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Provider ──────────────────────────────────────────────────────────────────

class JioSaavn extends StreamProvider {
  private readonly base = "https://saavn.sumit.co";

  constructor() {
    super("jiosaavn");
  }

  async search(key: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ query: key, limit: "10" });
    const res = await fetch(`${this.base}/api/search/songs?${params}`);
    if (!res.ok) {
      logger.warn(`Search failed — HTTP ${res.status} for query="${key}"`);
      return [];
    }
    const data = (await res.json()) as SearchResponse;
    return data.data?.results ?? [];
  }

  async getSong(id: string, from: RequestedBy): Promise<QueueData> {
    const res = await fetch(`${this.base}/api/songs/${id}`);
    if (!res.ok)
      throw new Error(
        `JioSaavn getSong failed: HTTP ${res.status} for id=${id}`,
      );
    const body = (await res.json()) as SongResponse;
    const song = body.data[0];
    if (!song) throw new Error("JioSaavn: empty song response");

    const mp3_link = bestDownloadUrl(song.downloadUrl);
    if (!mp3_link) throw new Error("JioSaavn: no download URL available");

    const artist =
      song.artists.primary.map((a) => a.name).join(", ") || "Unknown";
    const image = song.image.at(-1)?.url ?? "";

    return {
      link: song.url,
      title: song.name,
      image,
      artist,
      duration: formatDuration(song.duration),
      requestedBy: { id: from.id, first_name: from.first_name },
      mp3_link,
      provider: this.provider,
    };
  }
}

export const jiosaavn = new JioSaavn();
