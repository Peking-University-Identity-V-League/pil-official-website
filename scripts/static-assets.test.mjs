import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { build } from './build.mjs';

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'pil-assets-'));
  const source = join(root, 'public');
  try {
    await mkdir(join(source, 'assets', 'qr'), { recursive: true });
    await writeFile(join(source, 'index.html'), '北京大学第五人格赛事 <h1 id="hero-title"></h1><link href="/styles.css?v=old"><script src="/app.js?v=old"></script><img src="/assets/logo.png"><source srcset="/assets/mobile.png"><a href="/lottery/">工具</a><script src="https://umami.pkuidv.com/script.js"></script>');
    await writeFile(join(source, 'styles.css'), '@font-face{src:url(\'/assets/font.woff2\')}\n/* common styles */\n'.repeat(30));
    await writeFile(join(source, 'app.js'), 'const qr="/assets/qr/wechat.png";\n// application code\n'.repeat(30));
    for (const name of ['logo.png', 'mobile.png', 'font.woff2', 'qr/wechat.png']) await writeFile(join(source, 'assets', name), Buffer.from([0, 255, 128, 1, 2, 3]));
    await run(root, source);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('production HTML, CSS and dynamic QR URLs use the hash of the served bytes', async () => {
  await fixture(async root => {
    const { assets } = await build({ root, homepageCommit: 'a'.repeat(40) });
    const output = join(root, 'dist');
    for (const [original, url] of Object.entries(assets)) {
      const bytes = await readFile(join(output, url.slice(1)));
      const hash = createHash('sha256').update(bytes).digest('hex');
      assert.equal(url, '/_static/' + hash + original);
    }
    const html = await readFile(join(output, 'index.html'), 'utf8');
    for (const name of ['/styles.css', '/app.js', '/assets/logo.png', '/assets/mobile.png']) assert.ok(html.includes(assets[name]));
    assert.ok(!html.includes('?v=old'));
    assert.ok(html.includes('href="/lottery/"'));
    assert.ok(html.includes('https://umami.pkuidv.com/script.js'));
    const css = await readFile(join(output, assets['/styles.css'].slice(1)), 'utf8');
    assert.ok(css.includes(assets['/assets/font.woff2']));
    const js = await readFile(join(output, assets['/app.js'].slice(1)), 'utf8');
    assert.ok(js.includes(assets['/assets/qr/wechat.png']));
    // Old pages and the development server can still use the original URLs.
    assert.ok((await readFile(join(output, 'app.js'), 'utf8')).includes('"/assets/qr/wechat.png"'));
  });
});

test('HTML-only releases retain asset URLs and dependency changes invalidate only their consumers', async () => {
  await fixture(async (root, source) => {
    const first = await build({ root, homepageCommit: 'a'.repeat(40) });
    await writeFile(join(source, 'index.html'), (await readFile(join(source, 'index.html'), 'utf8')) + '<p>更新赛事介绍</p>');
    const second = await build({ root, homepageCommit: 'b'.repeat(40) });
    assert.deepEqual(second.assets, first.assets);
    await writeFile(join(source, 'assets', 'font.woff2'), 'changed-font');
    const third = await build({ root, homepageCommit: 'c'.repeat(40) });
    assert.notEqual(third.assets['/assets/font.woff2'], first.assets['/assets/font.woff2']);
    assert.notEqual(third.assets['/styles.css'], first.assets['/styles.css']);
    assert.equal(third.assets['/app.js'], first.assets['/app.js']);
    assert.equal(third.assets['/assets/logo.png'], first.assets['/assets/logo.png']);
    await writeFile(join(source, 'assets', 'qr', 'wechat.png'), 'changed-qr');
    const fourth = await build({ root, homepageCommit: 'd'.repeat(40) });
    assert.notEqual(fourth.assets['/app.js'], third.assets['/app.js']);
    assert.equal(fourth.assets['/styles.css'], third.assets['/styles.css']);
  });
});

test('Brotli and gzip decode to the exact original HTML and versioned text assets', async () => {
  await fixture(async root => {
    const { assets } = await build({ root, homepageCommit: 'a'.repeat(40) });
    for (const name of ['index.html', '__release.json', assets['/styles.css'].slice(1), assets['/app.js'].slice(1)]) {
      const file = join(root, 'dist', name);
      const bytes = await readFile(file);
      const br = await readFile(file + '.br');
      const gz = await readFile(file + '.gz');
      assert.deepEqual(brotliDecompressSync(br), bytes);
      assert.deepEqual(gunzipSync(gz), bytes);
      assert.ok(br.length < bytes.length);
      assert.ok(gz.length < bytes.length);
    }
    await assert.rejects(readFile(join(root, 'dist', assets['/assets/logo.png'].slice(1)) + '.br'), { code: 'ENOENT' });
  });
});

test('missing assets and circular CSS imports fail the build before publication', async () => {
  await fixture(async (root, source) => {
    await writeFile(join(source, 'styles.css'), 'body{background:url(/assets/missing.png)}');
    await assert.rejects(build({ root, homepageCommit: 'a'.repeat(40) }), /Missing static asset/);
    await writeFile(join(source, 'styles.css'), '@import "/other.css";');
    await writeFile(join(source, 'other.css'), '@import "/styles.css";');
    await assert.rejects(build({ root, homepageCommit: 'a'.repeat(40) }), /Circular static asset/);
  });
});
