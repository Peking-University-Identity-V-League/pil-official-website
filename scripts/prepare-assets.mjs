import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import sharp from 'sharp';

await mkdir('public/assets/logos', { recursive: true });
await mkdir('public/assets/qr', { recursive: true });
for (const file of ['bilibili.png', 'douyin.png', 'wechat.svg', 'xiaohongshu.png']) {
  await copyFile(`assets/logos/${file}`, `public/assets/logos/${file}`);
}
for (const variant of ['desktop', 'mobile']) {
  // 1080px wide still covers 3x phones without sending the 1440px source to every device.
  const artwork = sharp(`assets/source/${variant}.png`);
  if (variant === 'mobile') artwork.resize({ width: 1080 });
  await artwork.webp({ quality: 74, effort: 6 }).toFile(`public/assets/hero-${variant}.webp`);
}
await sharp('assets/source/desktop.png').resize(1200, 630, { fit: 'cover', position: 'right' })
  .jpeg({ quality: 80, mozjpeg: true }).toFile('public/assets/og-cover.jpg');
const platforms = JSON.parse(await readFile('platforms.json', 'utf8'));
for (const [key, value] of Object.entries(platforms)) {
  if (key === 'douyin') continue; // Use the uploaded, app-specific Douyin code.
  const options = { errorCorrectionLevel: 'M', margin: 4, color: { dark: '#191919', light: '#ffffff' } };
  await writeFile(`public/assets/qr/${key}.svg`, await QRCode.toString(value.url, { ...options, type: 'svg' }));
  await QRCode.toFile(`public/assets/qr/${key}.png`, value.url, { ...options, width: 600 });
}
await import('./crop-douyin.mjs');
await import('./prepare-brand.mjs');
console.log('Prepared artwork, logos, three QR codes and the supplied Douyin code.');
