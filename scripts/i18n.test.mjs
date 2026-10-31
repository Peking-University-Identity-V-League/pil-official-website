import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { localize, locales, translationProblems } from './i18n.mjs';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('every language defines all homepage copy and no entry is stale', () => {
  assert.deepEqual(translationProblems(html), { untranslated: [], unused: [], incomplete: [] });
  assert.equal(Object.keys(locales).length + 1, 8);
});

test('each language page declares its own language, URL and direction', () => {
  for (const code of Object.keys(locales)) {
    const page = localize(html, code);
    const direction = code === 'ar' ? ' dir="rtl"' : '';
    assert.ok(page.includes(`<html lang="${code}"${direction}>`), code);
    assert.ok(page.includes(`<link rel="canonical" href="https://pkuidv.com/${code}/">`), code);
    assert.ok(page.includes('pku-english-wordmark.svg'), code);
    assert.ok(!page.includes('{app}二维码'), code);
  }
});

test('account names and the language list are not translated', () => {
  const page = localize(html, 'fr');
  assert.ok(page.includes('<p class="account-name">北京大学第五人格赛事</p>'));
  assert.ok(page.includes('>中文</a>'));
  assert.ok(page.includes('<span class="lang-current">Français</span>'));
});
