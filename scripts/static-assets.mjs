import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, utimes, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const staticTypes = new Set(['.css', '.js', '.webp', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ico']);
const textTypes = new Set(['.html', '.css', '.js', '.svg', '.json', '.txt']);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function filesIn(directory, prefix = '') {
  const result = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await filesIn(join(directory, entry.name), name + '/'));
    else if (entry.isFile()) result.push(name);
  }
  return result;
}

// Only quoted root-relative URLs are rewritten. External URLs and navigation stay intact.
function replaceReferences(text, resolve) {
  return text.replace(/(["'`(])(\/[^"'`\s()<>]+)(?=["'`)\s<>])/g, (match, delimiter, url) => {
    if (url.startsWith('//')) return match;
    const parsed = new URL(url, 'https://pkuidv.com');
    const replacement = resolve(parsed.pathname);
    return replacement ? delimiter + replacement + parsed.hash : match;
  });
}

export async function versionAssets(output) {
  const files = (await filesIn(output)).filter(name => staticTypes.has(extname(name)));
  const source = new Map(await Promise.all(files.map(async name => ['/' + name, await readFile(join(output, name))])));
  const assets = {};
  const resolving = new Set();
  const emitted = new Map();
  function resolve(url) {
    if (assets[url]) return assets[url];
    if (!source.has(url)) {
      if (url.startsWith('/assets/')) throw new Error('Missing static asset: ' + url);
      return undefined;
    }
    if (resolving.has(url)) throw new Error('Circular static asset reference: ' + url);
    resolving.add(url);
    let bytes = source.get(url);
    if (['.css', '.js'].includes(extname(url))) bytes = Buffer.from(replaceReferences(bytes.toString('utf8'), resolve));
    const versioned = '/_static/' + digest(bytes) + url;
    assets[url] = versioned;
    emitted.set(versioned, bytes);
    resolving.delete(url);
    return versioned;
  }
  for (const url of source.keys()) resolve(url);
  for (const name of (await filesIn(output)).filter(file => extname(file) === '.html')) {
    const htmlPath = join(output, name);
    await writeFile(htmlPath, replaceReferences(await readFile(htmlPath, 'utf8'), resolve));
  }
  for (const [url, bytes] of emitted) {
    const file = join(output, url.slice(1));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  return Object.fromEntries(Object.entries(assets).sort(([a], [b]) => a.localeCompare(b, 'en')));
}

export async function precompress(output) {
  for (const name of await filesIn(output)) {
    if (!textTypes.has(extname(name))) continue;
    const file = join(output, name);
    const bytes = await readFile(file);
    const modified = await stat(file);
    const variants = {
      gz: gzipSync(bytes, { level: 9 }),
      br: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }),
    };
    for (const [extension, compressed] of Object.entries(variants)) {
      if (compressed.length >= bytes.length) continue;
      const sidecar = file + '.' + extension;
      await writeFile(sidecar, compressed);
      await utimes(sidecar, modified.atime, modified.mtime);
    }
  }
}
