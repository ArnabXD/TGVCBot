/**
 * Banner generation — produces a 600×300 PNG for the "Now Playing" message.
 *
 * Layout (Vinyl Heritage — Option A):
 *   [ left: circular album art, cyan ring border, center hole ]
 *   [ right: dark bg, NOW PLAYING label, title (cream), artist (muted), left bar accent ]
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
const ART_SIZE = 158;
const ACCENT = "#00E5FF";

/** Draw a simple eighth-note music glyph (♪) using canvas paths */
function drawMusicNote(ctx: SKRSContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  // note head
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.62, size * 0.22, size * 0.18, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // stem
  ctx.beginPath();
  ctx.moveTo(x + size * 0.18, y + size * 0.22);
  ctx.lineTo(x + size * 0.18, y - size * 0.15);
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.11;
  ctx.lineCap = "round";
  ctx.stroke();
  // flag (arc)
  ctx.beginPath();
  ctx.moveTo(x + size * 0.18, y - size * 0.15);
  ctx.quadraticCurveTo(x + size * 0.65, y + size * 0.05, x + size * 0.18, y + size * 0.25);
  ctx.stroke();
  ctx.restore();
}

/** Draw a classic studio microphone icon */
function drawMic(ctx: SKRSContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.09;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const cx = x + size * 0.5;

  // capsule body (oval)
  ctx.beginPath();
  ctx.ellipse(cx, y + size * 0.25, size * 0.28, size * 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();

  // vertical mesh lines inside capsule (3 lines)
  ctx.lineWidth = size * 0.055;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.18, y + size * 0.05);
  ctx.lineTo(cx - size * 0.18, y + size * 0.48);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, y + size * 0.02);
  ctx.lineTo(cx, y + size * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.18, y + size * 0.05);
  ctx.lineTo(cx + size * 0.18, y + size * 0.48);
  ctx.stroke();

  // horizontal mesh lines (2 lines)
  ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.26, y + size * 0.22);
  ctx.lineTo(cx + size * 0.26, y + size * 0.22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.26, y + size * 0.38);
  ctx.lineTo(cx + size * 0.26, y + size * 0.38);
  ctx.stroke();

  // stem below capsule
  ctx.lineWidth = size * 0.1;
  ctx.beginPath();
  ctx.moveTo(cx, y + size * 0.63);
  ctx.lineTo(cx, y + size * 0.88);
  ctx.stroke();

  // U-shaped cradle
  ctx.lineWidth = size * 0.09;
  ctx.beginPath();
  ctx.arc(cx, y + size * 0.75, size * 0.17, Math.PI, 0, false);
  ctx.stroke();

  // base line
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.22, y + size * 0.92);
  ctx.lineTo(cx + size * 0.22, y + size * 0.92);
  ctx.stroke();

  ctx.restore();
}

/** Draw a mini waveform (5 bars) using filled rectangles */
function drawWaveform(ctx: SKRSContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  const barW = 3;
  const gap = 2;
  const heights = [6, 10, 14, 10, 6]; // waveform envelope
  for (let i = 0; i < heights.length; i++) {
    const bx = x + i * (barW + gap);
    const bh = heights[i];
    ctx.fillRect(bx, y - bh / 2, barW, bh);
  }
  ctx.restore();
}

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
  maxLines = 2,
): string[] {
  ctx.font = font;
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      if (lines.length < maxLines - 1) {
        lines.push(line);
        line = word;
      } else {
        // last allowed line — truncate with ellipsis if needed
        const avail = maxWidth;
        while (ctx.measureText(line + "…").width > avail && line.length > 0) {
          line = line.slice(0, -1);
        }
        lines.push(line + "…");
        return lines;
      }
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

export async function generateBanner({
  image,
  title,
  artist,
}: BannerOptions): Promise<Uint8Array<ArrayBuffer>> {
  ensureFonts();

  const source = await fetchImageBuffer(image);
  if (!source) throw new Error(`Failed to fetch banner image: ${image}`);

  // Resize+crop album art into a square for circular display
  const artBuf = await sharp(source)
    .resize(ART_SIZE, ART_SIZE, { fit: "cover" })
    .toBuffer();
  const artImage = await loadImage(artBuf);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Background ──────────────────────────────────────────────────
  ctx.fillStyle = "#1A1A1A";
  ctx.fillRect(0, 0, W, H);

  // ── Circular album art (left-center) ────────────────────────────
  const cx = Math.round(ART_SIZE / 2) + 30; // circle center X
  const cy = Math.round(H / 2);              // circle center Y
  const r  = Math.round(ART_SIZE / 2);       // radius

  // Clip to circle, draw album art
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(artImage, 30, cy - r, ART_SIZE, ART_SIZE);
  ctx.restore();

  // Cyan ring border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Outer glow ring
  ctx.beginPath();
  ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,229,255,0.12)";
  ctx.lineWidth = 8;
  ctx.stroke();

  // Center hole
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#1A1A1A";
  ctx.fill();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.stroke();

  // ── Right panel: text content ───────────────────────────────────
  const textX = 30 + ART_SIZE + 36; // after the circle + gap
  const maxTextWidth = W - textX - 24;
  ctx.textBaseline = "top";

  // Measure title lines to vertically center (artist uses dynamic wrapLines)
  const titleLineHeight = 38;
  const titleLines = wrapLines(ctx, "bold 30px Poppins", title || "Music", maxTextWidth, 3);
  const artistLines = wrapLines(ctx, "400 20px Poppins", artist || "Unknown", maxTextWidth - 20, 2);
  const blockHeight =
    13 +                    // NOW PLAYING label
    18 +                    // gap
    titleLines.length * titleLineHeight +
    10 +                    // gap after title
    artistLines.length * 22 +
    32 +                    // gap + bottom line
    1;
  let y = Math.round((H - blockHeight) / 2);

  // "NOW PLAYING" label — cyan, bigger for readability
  ctx.font = "600 13px Poppins";
  ctx.fillStyle = ACCENT;
  drawMusicNote(ctx, textX - 16, y + 3, 13, ACCENT);
  ctx.fillText("NOW PLAYING", textX, y);
  y += 13 + 18;

  // Left accent bar — cyan, with glow
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, y - 4, 3, 52);
  // Glow effect (simulated with slightly wider semi-transparent bar)
  ctx.fillStyle = "rgba(0,229,255,0.25)";
  ctx.fillRect(0, y - 4, 6, 52);

  // Title — cream white
  ctx.font = "bold 30px Poppins";
  ctx.fillStyle = "#F0F9FF";
  for (const line of titleLines) {
    ctx.fillText(line, textX, y);
    y += titleLineHeight;
  }
  y += 10;

  // Artist — muted gray with mic icon to the left, wraps if too long
  ctx.font = "400 20px Poppins";
  ctx.fillStyle = "#7A8A9A";
  drawMic(ctx, textX - 4, y + 1, 20, "#7A8A9A");
  for (const line of artistLines) {
    ctx.fillText(line, textX + 20, y);
    y += 22;
  }
  y += 22;

  // Bottom accent line with mini waveform
  ctx.fillStyle = "rgba(0,229,255,0.35)";
  ctx.fillRect(textX, y, 28, 1);
  drawWaveform(ctx, textX + 36, y, "rgba(0,229,255,0.45)");

  // Watermark
  const watermark = env.WATERMARK.toUpperCase();
  ctx.font = "400 9px Poppins";
  ctx.fillStyle = "rgba(0,229,255,0.4)";
  ctx.textBaseline = "bottom";
  ctx.fillText(watermark, W - 24 - ctx.measureText(watermark).width, H - 18);

  const buffer = canvas.toBuffer("image/png");
  return new Uint8Array(buffer.buffer as ArrayBuffer);
}