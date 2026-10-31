import ar from './i18n/ar.mjs';
import en from './i18n/en.mjs';
import es from './i18n/es.mjs';
import fr from './i18n/fr.mjs';
import ja from './i18n/ja.mjs';
import ko from './i18n/ko.mjs';
import ru from './i18n/ru.mjs';
import { shared, source } from './i18n/source.mjs';

// The Chinese homepage is the single source; every other language page is rendered from it.
// Keep the language list in step with public/lang-detect.js and public/sitemap.xml.
export const locales = {
  en: { messages: en, ogLocale: 'en_US' },
  fr: { messages: fr, ogLocale: 'fr_FR' },
  ru: { messages: ru, ogLocale: 'ru_RU' },
  ja: { messages: ja, ogLocale: 'ja_JP' },
  ko: { messages: ko, ogLocale: 'ko_KR' },
  es: { messages: es, ogLocale: 'es_ES' },
  ar: { messages: ar, ogLocale: 'ar_EG', dir: 'rtl' },
};
const languageNames = { en: 'English', fr: 'Français', ru: 'Русский', ja: '日本語', ko: '한국어', es: 'Español', ar: 'العربية' };

const protectedParts = [
  // Real account names must stay searchable in their original form.
  /<p class="account-name">[^<]*<\/p>/g,
  // The preview mirrors the Chinese-only lottery tool and is hidden from assistive technology.
  /<span class="lottery-lineup"[\s\S]*?<\/a>/g,
  // Each language is always listed under its own name.
  /<ul class="lang-options">[\s\S]*?<\/ul>/g,
];
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function pairsFor(code) {
  const { messages, ogLocale, dir } = locales[code];
  const pairs = {
    '<html lang="zh-CN">': `<html lang="${code}"${dir ? ` dir="${dir}"` : ''}>`,
    '<link rel="canonical" href="https://pkuidv.com/">': `<link rel="canonical" href="https://pkuidv.com/${code}/">`,
    '<meta property="og:url" content="https://pkuidv.com/">': `<meta property="og:url" content="https://pkuidv.com/${code}/">`,
    '<meta property="og:locale" content="zh_CN">': `<meta property="og:locale" content="${ogLocale}">`,
    '<span class="lang-current">中文</span>': `<span class="lang-current">${languageNames[code]}</span>`,
    '<img class="pku-wordmark" src="/assets/logos/pku-chinese-wordmark.png" alt="北京大学" width="460" height="132">': '<img class="pku-wordmark is-english" src="/assets/logos/pku-english-wordmark.svg" alt="Peking University" width="441" height="31">',
    ...shared,
  };
  for (const [id, fragment] of Object.entries(source)) pairs[fragment] = messages[id];
  return pairs;
}

export function localize(html, code = 'en') {
  const pairs = pairsFor(code);
  const held = [];
  const hold = text => `\u0000${held.push(text) - 1}\u0000`;
  const input = protectedParts.reduce((text, pattern) => text.replace(pattern, hold), html);
  const keys = Object.keys(pairs).sort((a, b) => b.length - a.length);
  // One pass: translated text is never scanned again, so shorter keys cannot corrupt it.
  const translated = input.replace(new RegExp(keys.map(escapeRegExp).join('|'), 'g'), key => pairs[key]);
  return translated.replace(/\u0000(\d+)\u0000/g, (_, index) => held[Number(index)]);
}

// Used by verification so untranslated copy and stale entries fail before deployment.
// English shows anything the dictionary misses; the others must then define the same ids.
export function translationProblems(html) {
  const english = protectedParts.reduce((text, pattern) => text.replace(pattern, ''), localize(html, 'en'));
  const ids = Object.keys(source);
  const incomplete = Object.entries(locales).flatMap(([code, { messages }]) => [
    ...ids.filter(id => !messages[id]).map(id => `${code}: missing ${id}`),
    ...Object.keys(messages).filter(id => !(id in source)).map(id => `${code}: unknown ${id}`),
  ]);
  return {
    untranslated: [...new Set(english.match(/[㐀-鿿]+/g) || [])],
    unused: ids.filter(id => !html.includes(source[id])),
    incomplete,
  };
}
