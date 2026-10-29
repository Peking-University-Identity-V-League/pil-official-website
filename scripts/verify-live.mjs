import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const tactical = process.argv[2] === 'tactical';
const commit = tactical ? git('-C', '.upstream', 'rev-parse', 'HEAD') : (process.env.GITHUB_SHA || git('rev-parse', 'HEAD'));
const config = process.env.DEPLOY_CONFIG_REVISION || process.env.GITHUB_SHA || git('rev-parse', 'HEAD');
const paths = tactical
  ? ['/tactical-friend', '/zhanshuyanlian'].flatMap(prefix => ['/', '/js/bootstrap.js', '/css/style.css', '/locales/zh-CN.json', '/telemetry/privacy.js', '/__release.json'].map(path => prefix + path))
  : ['/', '/styles.css', '/app.js', '/assets/hero-desktop.webp', '/assets/qr/wechat.svg', '/__release.json'];

async function verify() {
  let homepageRelease;
  for (const path of paths) {
    const response = await fetch('https://pkuidv.com' + path + '?check=' + Date.now(), { headers: { 'Accept-Encoding': 'br, gzip' }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!response.ok || !/^nginx(?:\/|$)/i.test(response.headers.get('server') || '') || response.headers.has('cf-ray')) throw new Error('The direct CST response is unavailable at ' + path);
    if (path.endsWith('/__release.json')) {
      const release = await response.json();
      if (tactical ? release.source_commit !== commit || release.config_revision !== config : release.homepage_commit !== commit) throw new Error('Unexpected release at ' + path);
      if (!tactical) homepageRelease = release;
    } else if (path === '/' || tactical && path.endsWith('/')) {
      const html = await response.text();
      if (!html.includes('umami.pkuidv.com/script.js') || !html.includes(tactical ? 'homeMapGrid' : 'hero-title')) throw new Error('Unexpected entry page at ' + path);
      if (!tactical && (response.headers.get('content-encoding') !== 'br' || response.headers.get('cache-control') !== 'no-cache' || !html.includes('/_static/'))) throw new Error('Homepage compression or cache policy is missing.');
    } else {
      const expected = path.endsWith('.js') ? 'javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.json') ? 'application/json' : path.endsWith('.webp') ? 'image/webp' : 'image/svg+xml';
      if (!(response.headers.get('content-type') || '').includes(expected)) throw new Error('Unexpected static asset type at ' + path);
      await response.body?.cancel();
    }
  }
  if (!tactical) {
    const entries = Object.entries(homepageRelease?.assets || {});
    if (!entries.length) throw new Error('Missing versioned homepage assets.');
    for (const [original, asset] of entries) {
      const hash = /^\/_static\/([a-f0-9]{64})\//.exec(asset)?.[1];
      if (!hash || !asset.endsWith(original) || /[?#]/.test(asset)) throw new Error('Invalid versioned asset URL.');
      const response = await fetch('https://pkuidv.com' + asset, { headers: { 'Accept-Encoding': 'br, gzip' }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000) });
      const cache = response.headers.get('cache-control') || '';
      if (!response.ok || !cache.includes('max-age=31536000') || !cache.includes('immutable') || cache.includes('no-cache')) throw new Error('Missing immutable cache policy at ' + asset);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (createHash('sha256').update(bytes).digest('hex') !== hash) throw new Error('Versioned asset content differs from its URL at ' + asset);
      if (/\.(css|js)$/.test(original) && (response.headers.get('content-encoding') !== 'br' || !response.headers.get('vary')?.toLowerCase().includes('accept-encoding'))) throw new Error('Missing Brotli negotiation at ' + asset);
      if (original === '/styles.css' || original === '/assets/hero-desktop.webp') {
        const conditional = await fetch('https://pkuidv.com' + asset, { headers: { 'Accept-Encoding': 'br, gzip', 'If-None-Match': response.headers.get('etag') || '' }, redirect: 'error', signal: AbortSignal.timeout(12000) });
        await conditional.body?.cancel();
        if (conditional.status !== 304) throw new Error('ETag revalidation failed at ' + asset);
      }
    }
    const missing = await fetch('https://pkuidv.com/_static/' + '0'.repeat(64) + '/missing.css', { redirect: 'error', signal: AbortSignal.timeout(12000) });
    await missing.body?.cancel();
    if (missing.status !== 404 || missing.headers.get('cache-control')?.includes('immutable')) throw new Error('Missing static assets must not receive immutable caching.');
    console.log('Homepage Brotli, every content hash, one-year asset caching and ETag revalidation verified.');
  }
}

for (let attempt = 1; attempt <= 12; attempt++) {
  try { await verify(); console.log('Public direct CST paths serve the expected release and assets.'); break; }
  catch (error) { if (attempt === 12) throw error; console.log('Waiting for the public CST release. Attempt ' + attempt + '/12.'); await setTimeout(5000); }
}
