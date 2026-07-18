import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';

// Phase 3 §4 — "Image Compression", "Thumbnail Generation", "Future-ready
// for WebP". This is the concrete implementation, not just schema/URL
// plumbing: every uploaded image is re-encoded (dropping bloated EXIF/
// camera metadata and re-compressing), resized down to a sane max
// dimension if it's larger, and a WebP thumbnail is generated alongside
// the full-size version so the storefront can already request WebP today
// rather than this being a "we'll add it later" placeholder.
const MAX_WIDTH = 1600;
const THUMB_WIDTH = 400;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 80;

export interface ProcessedImage {
  url: string;       // full-size, compressed, original format
  thumbnailUrl: string; // 400px-wide WebP thumbnail
  webpUrl: string;   // full-size WebP (future-ready default)
}

function randomFilename(ext: string): string {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
}

function toPublicUrl(relativePath: string): string {
  return `${env.upload.backendUrl}/uploads/${relativePath.split(path.sep).join('/')}`;
}

/**
 * Processes an uploaded image buffer into three on-disk files under
 * `{UPLOAD_PATH}/{subfolder}/`: a compressed full-size version (same
 * format as the source, capped at MAX_WIDTH), a WebP thumbnail, and a
 * full-size WebP. Returns the public URLs (via the existing `/uploads`
 * static route in app.ts) for all three.
 */
export async function processAndSaveImage(
  buffer: Buffer,
  mimetype: string,
  subfolder: 'products' | 'colors' | 'size-guides'
): Promise<ProcessedImage> {
  const dir = path.join(process.cwd(), env.upload.path, subfolder);
  await fs.mkdir(dir, { recursive: true });

  const image = sharp(buffer).rotate(); // .rotate() with no args auto-orients from EXIF, then strips it
  const metadata = await image.metadata();
  const needsResize = (metadata.width ?? 0) > MAX_WIDTH;

  const ext = mimetype === 'image/png' ? 'png' : 'jpeg';
  const baseName = randomFilename(ext);
  const thumbName = randomFilename('webp');
  const webpName = randomFilename('webp');

  const mainPipeline = needsResize ? image.clone().resize({ width: MAX_WIDTH }) : image.clone();
  const mainBuffer = ext === 'png'
    ? await mainPipeline.png({ compressionLevel: 8 }).toBuffer()
    : await mainPipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();

  const thumbBuffer = await image.clone()
    .resize({ width: THUMB_WIDTH })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const webpBuffer = await (needsResize ? image.clone().resize({ width: MAX_WIDTH }) : image.clone())
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  await Promise.all([
    fs.writeFile(path.join(dir, baseName), mainBuffer),
    fs.writeFile(path.join(dir, thumbName), thumbBuffer),
    fs.writeFile(path.join(dir, webpName), webpBuffer),
  ]);

  return {
    url: toPublicUrl(path.join(subfolder, baseName)),
    thumbnailUrl: toPublicUrl(path.join(subfolder, thumbName)),
    webpUrl: toPublicUrl(path.join(subfolder, webpName)),
  };
}
