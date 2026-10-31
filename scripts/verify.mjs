import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { localize, locales, translationProblems } from './i18n.mjs';

const platforms = JSON.parse(await readFile('platforms.json', 'utf8'));
const html = await readFile('public/index.html', 'utf8');
for (const [key, value] of Object.entries(platforms)) {
  if (key === 'douyin') {
    await stat('assets/source/douyin-share.jpg');
    await sharp('public/assets/qr/douyin.png').metadata();
    assert.ok(html.includes('src="/assets/qr/douyin-thumb.webp"'), 'Douyin must display the supplied code');
    console.log('PASS douyin: supplied code asset present; proprietary code requires the Douyin app to scan');
  } else {
    const { data, info } = await sharp(`public/assets/qr/${key}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const result = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    assert.equal(result?.data, value.url, `${key}: QR payload differs from supplied link`);
    const svg = await readFile(`public/assets/qr/${key}.svg`, 'utf8');
    assert.ok(svg.includes('<svg'), `${key}: missing vector QR`);
    console.log(`PASS ${key}: decoded exact original link`);
  }
  if (key === 'wechat') assert.ok(!html.includes(`href="${value.url}"`), 'WeChat must have no external hyperlink');
  else assert.ok(html.includes(`href="${value.url}" target="_blank" rel="noopener noreferrer"`), `${key}: missing external link`);
  console.log(`PASS ${key}: expected link behavior present`);
}
const pages = Object.keys(locales).map(code => localize(html, code));
const refs = [...[html, ...pages].join('').matchAll(/(?:src|href|srcset)="(\/[^"#]+)"/g)].map(x => x[1]);
for (const ref of new Set(refs)) if (!/^\/([a-z]{2}\/)?$/.test(ref)) await stat(`public${new URL(ref, 'https://pkuidv.com').pathname}`);
for (const type of ['desktop','mobile']) {
  const metadata = await sharp(`public/assets/hero-${type}.webp`).metadata();
  assert.ok(type === 'desktop' ? metadata.width > metadata.height : metadata.height > metadata.width);
}
assert.deepEqual(translationProblems(html), { untranslated: [], unused: [], incomplete: [] }, 'Homepage translations are out of date');
// The production receiver rejects a whole release if it contains any other file type.
const deployable = new Set(['.html', '.css', '.js', '.json', '.webp', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ico', '.txt']);
const published = await readdir('public', { recursive: true, withFileTypes: true });
for (const entry of published) if (entry.isFile()) assert.ok(deployable.has(extname(entry.name).toLowerCase()), `${entry.name}: file type is not accepted by the release receiver`);
const font = await readFile('public/assets/title-serif.woff2');
assert.equal(font.subarray(0, 4).toString(), 'wOF2', 'Heading font must be WOFF2');
console.log('PASS all HTML assets exist; responsive artwork and local heading font valid.');
