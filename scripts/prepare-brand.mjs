import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

await mkdir('public/assets/logos', { recursive: true });
const original = 'assets/source/pil-logo.png';
// Keep the complete supplied artwork and its proportions; only encode/resize.
await sharp(original).resize({ width: 640, withoutEnlargement: true })
  .webp({ quality: 92 }).toFile('public/assets/logos/pil-logo.webp');
for (const [size, filename] of [[96, 'pil-favicon.png'], [180, 'pil-touch-icon.png']]) {
  await sharp(original).resize(size, size, { fit: 'contain', background: '#ffffff' })
    .png().toFile(`public/assets/${filename}`);
}
console.log('Prepared supplied PIL logo, site icon and touch icon.');

// Official Chinese wordmark: preserve the supplied alpha silhouette exactly.
// Apply the VIS Web value #94070A (not an ad-hoc CMYK conversion).
const pkuOriginal = sharp('assets/source/pku-chinese-wordmark.png');
const { width, height } = await pkuOriginal.metadata();
const alpha = await pkuOriginal.extractChannel('alpha').raw().toBuffer();
await sharp({ create: { width, height, channels: 3, background: '#94070a' } })
  .joinChannel(alpha, { raw: { width, height, channels: 1 } })
  .png().toFile('public/assets/logos/pku-chinese-wordmark.png');
console.log('Prepared official PKU wordmark in the specified Web color #94070A.');
