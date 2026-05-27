/**
 * Text-to-image renderer using @napi-rs/canvas.
 *
 * Draws word-wrapped text onto a canvas and returns the PNG buffer.
 * Adapted from https://github.com/bostrom/text-to-image (ISC License).
 */

import { join } from "node:path";
import { type Canvas, createCanvas, GlobalFonts } from "@napi-rs/canvas";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TextOptions {
  fontSize?: number;
  lineHeight?: number;
  maxWidth?: number;
  fontPath?: string;
  fontFamily?: string;
  bgColor?: string;
  textColor?: string;
}

interface TextResult {
  height: number;
  width: number;
  buffer: Buffer;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULTS = {
  fontSize: 18,
  lineHeight: 28,
  maxWidth: 350,
  fontFamily: "Poppins-Regular",
  fontPath: join(process.cwd(), "fonts", "Poppins-Regular.ttf"),
  bgColor: "#000000",
  textColor: "#FFFFFF",
};

// ── Core renderer ─────────────────────────────────────────────────────────────

function measureText(
  text: string,
  opts: Required<TextOptions>,
): { textHeight: number } {
  const canvas = createCanvas(opts.maxWidth, 100);
  const ctx = canvas.getContext("2d");

  if (opts.fontPath)
    GlobalFonts.registerFromPath(opts.fontPath, opts.fontFamily);

  ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
  ctx.textBaseline = "top";

  const words = text.split(" ");
  let line = "";
  let y = 0;

  for (let n = 0; n < words.length; n++) {
    const word = words[n]!;
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > opts.maxWidth && n > 0) {
      y += opts.lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }

  return { textHeight: y + Math.max(opts.lineHeight, opts.fontSize) };
}

function renderText(text: string, opts: Required<TextOptions>): Canvas {
  const { textHeight } = measureText(text, opts);
  const canvas = createCanvas(opts.maxWidth, textHeight);
  const ctx = canvas.getContext("2d");

  if (opts.fontPath)
    GlobalFonts.registerFromPath(opts.fontPath, opts.fontFamily);

  ctx.fillStyle = opts.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = opts.textColor;
  ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
  ctx.textBaseline = "top";

  const words = text.split(" ");
  let line = "";
  let y = 0;

  for (let n = 0; n < words.length; n++) {
    const word = words[n]!;
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > opts.maxWidth && n > 0) {
      ctx.fillText(line, 0, y);
      y += opts.lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 0, y);

  return canvas;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getImage(
  text: string,
  options: TextOptions = {},
): Promise<TextResult> {
  const opts: Required<TextOptions> = { ...DEFAULTS, ...options };
  const canvas = renderText(text, opts);
  return {
    height: canvas.height,
    width: canvas.width,
    buffer: canvas.toBuffer("image/png"),
  };
}
