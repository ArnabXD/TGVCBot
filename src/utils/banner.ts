/**
 * Banner generation — produces a 600×300 PNG for the "Now Playing" message.
 *
 * Layout (aligned with the Mini App's now-playing hero):
 *   [ left: squircle album art, soft shadow, faint vinyl-disc edge behind ]
 *   [ right: near-black bg + teal ambient glow, NOW PLAYING label, title, artist, left bar accent ]
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
const ART_SIZE = 168;
const ART_RADIUS = 26; // squircle corner radius, mirrors the Mini App's square art
const ACCENT = "#2ec4b6"; // teal — matches the Mini App accent
const ACCENT_RGB = "46,196,182";
const BG = "#0f1115"; // near-black, matches the Mini App background
const TITLE = "#f3f5f7";
const MUTED = "#8a94a3";

/** Trace a rounded-rectangle path (squircle) for clipping/stroking */
function roundRectPath(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw a simple eighth-note music glyph (♪) using canvas paths */
function drawMusicNote(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  // note head
  ctx.beginPath();
  ctx.ellipse(
    x,
    y + size * 0.62,
    size * 0.22,
    size * 0.18,
    -0.4,
    0,
    Math.PI * 2,
  );
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
  ctx.quadraticCurveTo(
    x + size * 0.65,
    y + size * 0.05,
    x + size * 0.18,
    y + size * 0.25,
  );
  ctx.stroke();
  ctx.restore();
}

/** Draw a classic studio microphone icon */
function drawMic(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
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

  // Resize+crop album art into a square for the squircle display
  const artBuf = await sharp(source)
    .resize(ART_SIZE, ART_SIZE, { fit: "cover" })
    .toBuffer();
  const artImage = await loadImage(artBuf);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Background ──────────────────────────────────────────────────
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Ambient radial glow (top-left, over the art) — mirrors the Mini App's
  // accent-tinted ambient wash so the two surfaces read as one product.
  const glow = ctx.createRadialGradient(150, 40, 0, 150, 40, 360);
  glow.addColorStop(0, `rgba(${ACCENT_RGB},0.16)`);
  glow.addColorStop(1, `rgba(${ACCENT_RGB},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Squircle album art (left-center) ────────────────────────────
  const artX = 34;
  const artY = Math.round((H - ART_SIZE) / 2);
  const cy = Math.round(H / 2); // vertical center, shared by the vinyl nod

  // Vinyl-edge nod: a faint disc whose rim barely peeks past the art's right
  // side — a subtle echo of the Mini App's hero, not a heavy crescent.
  const discR = Math.round(ART_SIZE * 0.46);
  const discPeek = 20; // how far the rim shows beyond the art edge
  const discCx = artX + ART_SIZE + discPeek - discR;
  const discGrad = ctx.createRadialGradient(
    discCx,
    cy,
    discR * 0.55,
    discCx,
    cy,
    discR,
  );
  discGrad.addColorStop(0, "#1c2027");
  discGrad.addColorStop(1, "#262b33");
  ctx.beginPath();
  ctx.arc(discCx, cy, discR, 0, Math.PI * 2);
  ctx.fillStyle = discGrad;
  ctx.fill();
  ctx.strokeStyle = `rgba(${ACCENT_RGB},0.14)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Soft drop shadow under the art
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 14;
  roundRectPath(ctx, artX, artY, ART_SIZE, ART_SIZE, ART_RADIUS);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();

  // Clip to squircle, draw album art
  ctx.save();
  roundRectPath(ctx, artX, artY, ART_SIZE, ART_SIZE, ART_RADIUS);
  ctx.clip();
  ctx.drawImage(artImage, artX, artY, ART_SIZE, ART_SIZE);
  ctx.restore();

  // Subtle inner hairline border (matches the app's inset 1px ring)
  roundRectPath(
    ctx,
    artX + 0.5,
    artY + 0.5,
    ART_SIZE - 1,
    ART_SIZE - 1,
    ART_RADIUS,
  );
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Right panel: text content ───────────────────────────────────
  const textX = artX + ART_SIZE + 40; // after the art + gap
  const maxTextWidth = W - textX - 24;
  ctx.textBaseline = "top";

  // Measure title lines to vertically center (artist uses dynamic wrapLines)
  const titleLineHeight = 38;
  const titleLines = wrapLines(
    ctx,
    "bold 30px Poppins",
    title || "Music",
    maxTextWidth,
    3,
  );
  const artistLines = wrapLines(
    ctx,
    "400 20px Poppins",
    artist || "Unknown",
    maxTextWidth - 20,
    2,
  );
  const blockHeight =
    13 + // NOW PLAYING label
    18 + // gap
    titleLines.length * titleLineHeight +
    10 + // gap after title
    artistLines.length * 22 +
    32 + // gap + bottom line
    1;
  let y = Math.round((H - blockHeight) / 2);

  // "NOW PLAYING" label — cyan, bigger for readability
  ctx.font = "600 13px Poppins";
  ctx.fillStyle = ACCENT;
  drawMusicNote(ctx, textX - 16, y + 3, 13, ACCENT);
  ctx.fillText("NOW PLAYING", textX, y);
  y += 13 + 18;

  // Left accent bar — teal, with glow
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, y - 4, 3, 52);
  // Glow effect (simulated with slightly wider semi-transparent bar)
  ctx.fillStyle = `rgba(${ACCENT_RGB},0.25)`;
  ctx.fillRect(0, y - 4, 6, 52);

  // Title
  ctx.font = "bold 30px Poppins";
  ctx.fillStyle = TITLE;
  for (const line of titleLines) {
    ctx.fillText(line, textX, y);
    y += titleLineHeight;
  }
  y += 10;

  // Artist — muted gray with mic icon to the left, wraps if too long
  ctx.font = "400 20px Poppins";
  ctx.fillStyle = MUTED;
  drawMic(ctx, textX - 4, y + 1, 20, MUTED);
  for (const line of artistLines) {
    ctx.fillText(line, textX + 20, y);
    y += 22;
  }
  y += 22;

  // Bottom accent line with mini waveform
  ctx.fillStyle = `rgba(${ACCENT_RGB},0.35)`;
  ctx.fillRect(textX, y, 28, 1);
  drawWaveform(ctx, textX + 36, y, `rgba(${ACCENT_RGB},0.45)`);

  // Watermark
  const watermark = env.WATERMARK.toUpperCase();
  ctx.font = "400 9px Poppins";
  ctx.fillStyle = `rgba(${ACCENT_RGB},0.4)`;
  ctx.textBaseline = "bottom";
  ctx.fillText(watermark, W - 24 - ctx.measureText(watermark).width, H - 18);

  const buffer = canvas.toBuffer("image/png");
  return new Uint8Array(buffer.buffer as ArrayBuffer);
}
