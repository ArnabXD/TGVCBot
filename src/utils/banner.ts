/**
 * Banner generation — produces a 600×300 PNG for the "Now Playing" message.
 *
 * Layout (Variant B — Editorial Split):
 *   [ left 200px: album art, dimmed, fading right ]
 *   [ right 400px: dark bg, NOW PLAYING label, bold title, artist, divider, watermark ]
 */

import { join } from "node:path";
import {
  createCanvas,
  GlobalFonts,
  loadImage,
  type SKRSContext2D,
} from "@napi-rs/canvas";
import { consola } from "consola";
import sharp from "sharp";
import env from "../env";

const logger = consola.withTag("banner");

const FONTS_DIR = join(process.cwd(), "fonts");
const W = 600;
const H = 300;
const SPLIT = 200;

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(
    join(FONTS_DIR, "Poppins-Regular.ttf"),
    "Poppins",
  );
  GlobalFonts.registerFromPath(join(FONTS_DIR, "Poppins-Bold.ttf"), "Poppins");
  fontsRegistered = true;
}

export interface BannerOptions {
  image: string;
  title: string;
  artist: string;
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn(`Image fetch failed — HTTP ${res.status} for url=${url}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    logger.warn(`Image fetch error for url=${url}`, err);
    return null;
  }
}

function wrapLines(
  ctx: SKRSContext2D,
  font: string,
  text: string,
  maxWidth: number,
): string[] {
  ctx.font = font;
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateBanner({
  image,
  title,
  artist,
}: BannerOptions): Promise<Uint8Array<ArrayBuffer>> {
  ensureFonts();

  const source = await fetchImageBuffer(image);
  if (!source) throw new Error(`Failed to fetch banner image: ${image}`);

  // Resize+crop album art to fill the left panel
  const artBuf = await sharp(source)
    .resize(SPLIT, H, { fit: "cover" })
    .toBuffer();
  const artImage = await loadImage(artBuf);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Right panel background ─────────────────────────────────────
  ctx.fillStyle = "#0e0e0e";
  ctx.fillRect(0, 0, W, H);

  // ── Left panel: album art ──────────────────────────────────────
  ctx.drawImage(artImage, 0, 0, SPLIT, H);

  // Dim the art
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, SPLIT, H);

  // Fade right edge of art into the dark background
  const fade = ctx.createLinearGradient(SPLIT - 80, 0, SPLIT, 0);
  fade.addColorStop(0, "rgba(14,14,14,0)");
  fade.addColorStop(1, "rgba(14,14,14,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(SPLIT - 80, 0, 80, H);

  // ── Right panel content ────────────────────────────────────────
  const textX = SPLIT + 28;
  const maxTextWidth = W - textX - 24;
  ctx.textBaseline = "top";

  // Measure title lines to vertically center the whole block
  const titleLineHeight = 36;
  const titleLines = wrapLines(ctx, "bold 28px Poppins", title || "Music", maxTextWidth);
  const blockHeight =
    12 +  // NOW PLAYING label
    14 +  // gap after label
    titleLines.length * titleLineHeight +
    12 +  // gap after title
    18 +  // artist line height
    20 +  // gap + divider
    1;
  let y = Math.round((H - blockHeight) / 2);

  // "NOW PLAYING" label
  ctx.font = "600 10px Poppins";
  ctx.fillStyle = "#a78bfa";
  ctx.fillText("▶  NOW PLAYING", textX, y);
  y += 12 + 14;

  // Title (bold, large)
  ctx.font = "bold 28px Poppins";
  ctx.fillStyle = "#ffffff";
  for (const line of titleLines) {
    ctx.fillText(line, textX, y);
    y += titleLineHeight;
  }
  y += 12;

  // Artist
  ctx.font = "400 15px Poppins";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText(artist || "Unknown", textX, y);
  y += 18 + 20;

  // Divider
  ctx.fillStyle = "rgba(167,139,250,0.35)";
  ctx.fillRect(textX, y, 32, 1);

  // Watermark
  ctx.font = "400 9px Poppins";
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.textBaseline = "bottom";
  ctx.fillText(env.WATERMARK.toUpperCase(), W - 24 - ctx.measureText(env.WATERMARK.toUpperCase()).width, H - 18);

  const buffer = canvas.toBuffer("image/png");
  return new Uint8Array(buffer.buffer as ArrayBuffer);
}