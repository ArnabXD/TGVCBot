/**
 * Banner generation — produces a 600×300 PNG for the "Now Playing" message.
 *
 * Layout:
 *   [ blurred+dimmed background (600×300) ]
 *     [ thumbnail (180×180) at (30, 60)  ]
 *     [ title text at (220, 55)           ]
 *     [ artist text below title           ]
 *     [ watermark at bottom-right         ]
 */

import sharp from "sharp";
import env from "../env";
import { getImage } from "./text-to-image";

export interface BannerOptions {
  image: string;
  title: string;
  artist: string;
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function generateBanner({
  image,
  title,
  artist,
}: BannerOptions): Promise<Uint8Array<ArrayBuffer>> {
  const source = await fetchImageBuffer(image);
  if (!source) throw new Error(`Failed to fetch banner image: ${image}`);

  const background = await sharp(source).resize(600, 300).blur(15).toBuffer();
  const thumb = await sharp(source).resize(180, 180).toBuffer();

  const titleImg = await getImage(title || "Music", {
    fontSize: 26,
    lineHeight: 35,
  });
  const artistImg = await getImage(artist || "...");
  const watermarkImg = await getImage(env.WATERMARK, { fontSize: 14 });

  const result = await sharp(background)
    .composite([
      // dark overlay for readability
      {
        input: {
          create: {
            width: 600,
            height: 300,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0.5 },
          },
        },
      },
      { input: thumb, left: 30, top: 60 },
      { input: titleImg.buffer, left: 220, top: 55, blend: "screen" },
      {
        input: artistImg.buffer,
        left: 220,
        top: 55 + titleImg.height,
        blend: "screen",
      },
      {
        input: watermarkImg.buffer,
        top: 300 - watermarkImg.height,
        left: 480,
        blend: "screen",
      },
    ])
    .png()
    .toBuffer();

  return new Uint8Array(result.buffer as ArrayBuffer);
}
