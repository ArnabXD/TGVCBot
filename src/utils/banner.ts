import sharp from 'sharp';
import axios from 'axios';
import { getImage } from './text-to-image';
import env from '../env';

export const getBufferFromUrl = async (url: string) => {
  try {
    const buffer: Buffer = (
      await axios({ url: url, responseType: 'arraybuffer' })
    ).data;
    return Buffer.isBuffer(buffer) ? buffer : false;
  } catch (error) {
    return false;
  }
};

interface BannerProps {
  image: string;
  title: string;
  artist: string;
}

export const generateBanner = async ({
  image,
  title,
  artist
}: BannerProps): Promise<Buffer> => {
  const source = (await getBufferFromUrl(image)) as Buffer;
  const background = await sharp(source).resize(600, 300).blur(15).toBuffer();
  const thumb = await sharp(source).resize(180, 180).toBuffer();

  const TitleText = await getImage(title || '', {
    fontSize: 26,
    lineHeight: 35
  });
  const ArtistText = await getImage(artist || '');
  const BottomBanner = await getImage(env.WATERMARK, { fontSize: 14 });

  const thumbnail = sharp(background)
    .composite([
      {
        input: {
          create: {
            width: 600,
            height: 300,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0.5 }
          }
        }
      },
      { input: thumb, left: 30, top: 60 },
      { input: TitleText.buffer, left: 220, top: 55, blend: 'screen' },
      {
        input: ArtistText.buffer,
        left: 220,
        top: 55 + TitleText.height,
        blend: 'screen'
      },
      {
        input: BottomBanner.buffer,
        top: 300 - BottomBanner.height,
        left: 480,
        blend: 'screen'
      }
    ])
    .png();

  return await thumbnail.toBuffer();
};
