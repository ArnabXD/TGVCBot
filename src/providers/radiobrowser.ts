import { consola } from "consola";
import type { QueueData } from "../queue";
import StreamProvider, { type RequestedBy } from "./base";

const logger = consola.withTag("radiobrowser");

// ── API types (radio-browser.info) ────────────────────────────────────────────

interface Station {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  codec: string;
  bitrate: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** A human-friendly "artist" line for a radio station from its metadata. */
function stationSubtitle(s: Station): string {
  const parts = [
    s.country,
    s.codec,
    s.bitrate ? `${s.bitrate}kbps` : "",
  ].filter(Boolean);
  return parts.join(" · ") || "Live Stream";
}

// ── Provider ──────────────────────────────────────────────────────────────────

class RadioBrowser extends StreamProvider {
  // radio-browser.info runs a pool of mirror servers behind round-robin DNS.
  // Any one of them serves the full JSON API; de1 is a stable public mirror.
  private readonly base = "https://de1.api.radio-browser.info";

  // radio-browser.info asks API clients to send an identifying User-Agent.
  private readonly headers = { "User-Agent": "TGVCBot/1.0" };

  constructor() {
    super("radio");
  }

  async search(key: string): Promise<Station[]> {
    const params = new URLSearchParams({
      name: key,
      limit: "20",
      hidebroken: "true",
      order: "votes",
      reverse: "true",
    });
    const res = await fetch(`${this.base}/json/stations/search?${params}`, {
      headers: this.headers,
    });
    if (!res.ok) {
      logger.warn(`Search failed — HTTP ${res.status} for query="${key}"`);
      return [];
    }
    const data = (await res.json()) as Station[];
    // Drop stations the API knows have no playable URL.
    return data.filter((s) => s.url_resolved || s.url);
  }

  async getSong(id: string, from: RequestedBy): Promise<QueueData> {
    const res = await fetch(`${this.base}/json/stations/byuuid/${id}`, {
      headers: this.headers,
    });
    if (!res.ok)
      throw new Error(
        `RadioBrowser getSong failed: HTTP ${res.status} for id=${id}`,
      );
    const stations = (await res.json()) as Station[];
    const station = stations[0];
    if (!station) throw new Error("RadioBrowser: station not found");

    const mp3_link = station.url_resolved || station.url;
    if (!mp3_link) throw new Error("RadioBrowser: no stream URL available");

    // Register the play with radio-browser so it counts toward station stats.
    // Best-effort — never block playback on it.
    fetch(`${this.base}/json/url/${id}`, { headers: this.headers }).catch(
      () => {},
    );

    return {
      link: station.homepage || mp3_link,
      title: station.name.trim() || "Radio",
      image: station.favicon || "",
      artist: stationSubtitle(station),
      duration: "∞",
      requestedBy: { id: from.id, first_name: from.first_name },
      mp3_link,
      provider: this.provider,
    };
  }
}

export const radiobrowser = new RadioBrowser();
