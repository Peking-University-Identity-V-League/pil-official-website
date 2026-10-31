// Runs before the page renders. Only the root address chooses a language automatically:
// a saved choice wins, then the browser's languages. A shared /fr/ link always stays French.
(function () {
  if (location.pathname !== '/') return;
  // Crawlers must be able to read the Chinese page; they find the others through hreflang.
  if (/bot|spider|crawl|slurp/i.test(navigator.userAgent)) return;

  const paths = { zh: '/', en: '/en/', fr: '/fr/', ru: '/ru/', ja: '/ja/', ko: '/ko/', es: '/es/', ar: '/ar/' };
  let saved = null;
  try {
    saved = localStorage.getItem('pil-lang');
  } catch {
    // Storage can be blocked; fall through to the browser's languages.
  }

  let target = paths[saved];
  if (!target) {
    // Coming from this site means the visitor already chose to be here, even if storage failed.
    if (document.referrer.startsWith(location.origin + '/')) return;
    const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
    const match = preferred.map(tag => String(tag).split('-')[0].toLowerCase()).find(base => paths[base]);
    // Readers of other languages are better served by English than by Chinese.
    target = match ? paths[match] : paths.en;
  }
  if (target !== '/') location.replace(target + location.search + location.hash);
})();
