import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import sharp from 'sharp';

await mkdir('public/assets/logos', { recursive: true });
await mkdir('public/assets/qr', { recursive: true });
for (const file of ['bilibili.png', 'bilibili-wordmark.svg', 'douyin.png', 'wechat.svg', 'xiaohongshu.png']) {
  await copyFile(`assets/logos/${file}`, `public/assets/logos/${file}`);
}
for (const variant of ['desktop', 'mobile']) {
  await sharp(`assets/source/${variant}.png`).webp({ quality: 87, effort: 6 }).toFile(`public/assets/hero-${variant}.webp`);
}
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
