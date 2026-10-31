const platforms = {
  bilibili: { title: '北京大学第五人格赛事', qr: '/assets/qr/bilibili.png' },
  douyin: { title: '北大第五人格赛事', qr: '/assets/qr/douyin.png' },
  wechat: { title: 'PIL 庄园指北', qr: '/assets/qr/wechat.png' },
  xiaohongshu: { title: '北京大学第五人格赛事', qr: '/assets/qr/xiaohongshu.png' }
};
// A phone cannot scan its own screen, so touch devices get the save-then-scan route.
const usesPhone = window.matchMedia('(pointer: coarse)').matches;
const dialog = document.querySelector('.qr-dialog');
let previousFocus;

function trackEvent(name) {
  try {
    window.umami?.track(name)?.catch?.(() => {});
  } catch {
    // Analytics must never interrupt navigation or the QR dialog.
  }
}

function openQr(key, trigger) {
  const info = platforms[key];
  if (!info) return;
  // Localized copy lives in the page, so app.js stays the same for every language.
  const app = document.querySelector(`.platform-card.${key}`).dataset.app;
  const fill = template => template.replace('{app}', app);
  previousFocus = trigger;
  document.querySelector('#qr-platform').textContent = app;
  document.querySelector('#qr-title').textContent = info.title;
  document.querySelector('#qr-instruction').textContent = fill(usesPhone ? dialog.dataset.scanPhone : dialog.dataset.scan);
  const image = document.querySelector('#qr-large');
  image.src = info.qr;
  image.alt = fill(dialog.dataset.alt);
  const download = document.querySelector('#qr-download');
  download.href = info.qr;
  download.download = `PIL-${key}-QR.png`;
  download.dataset.platform = key;
  dialog.showModal();
  document.body.classList.add('dialog-open');
  trackEvent(`qr_open_${key}`);
}

document.querySelectorAll('[data-qr]').forEach(button => {
  button.addEventListener('click', () => openQr(button.dataset.qr, button));
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('dialog-open');
  previousFocus?.focus({ preventScroll: true });
});

for (const key of ['bilibili', 'douyin', 'xiaohongshu']) {
  document.querySelector(`.${key} .platform-link`).addEventListener('click', () => {
    trackEvent(`platform_visit_${key}`);
  });
}
document.querySelector('#qr-download').addEventListener('click', event => {
  const key = event.currentTarget.dataset.platform;
  if (platforms[key]) trackEvent(`qr_save_${key}`);
});
document.querySelectorAll('.hero-actions a').forEach(link => {
  link.addEventListener('click', () => trackEvent(`section_open_${link.hash.slice(1)}`));
});
document.querySelectorAll('[data-track]').forEach(element => {
  element.addEventListener('click', () => trackEvent(element.dataset.track));
});

const headerShell = document.querySelector('#header-shell');
const navLinks = [...document.querySelectorAll('.nav-link[data-nav]')];
const trackedSections = ['about', 'tactical', 'lottery', 'channels']
  .map(id => document.getElementById(id))
  .filter(Boolean);

if ('IntersectionObserver' in window) {
  const scrollMarker = document.createElement('div');
  scrollMarker.className = 'scroll-marker';
  scrollMarker.setAttribute('aria-hidden', 'true');
  document.body.prepend(scrollMarker);
  new IntersectionObserver(([entry]) => {
    headerShell?.classList.toggle('is-scrolled', !entry.isIntersecting);
  }).observe(scrollMarker);

  // A thin band near the top of the viewport decides which section the nav highlights.
  const inBand = new Set();
  const navObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) inBand.add(entry.target);
      else inBand.delete(entry.target);
    }
    const currentId = trackedSections.findLast(section => inBand.has(section))?.id ?? 'top';
    for (const link of navLinks) {
      if (link.dataset.nav === currentId) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }, { rootMargin: '-20% 0px -79% 0px' });
  trackedSections.forEach(section => navObserver.observe(section));

  document.documentElement.classList.add('js-ready');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal-section').forEach(section => observer.observe(section));
}

const tacTabs = [...document.querySelectorAll('.tac-tab[data-tac-mode]')];
const tacPanes = [...document.querySelectorAll('.tac-pane[data-pane]')];

function activateTacTab(tab, focus = false) {
  const mode = tab.dataset.tacMode;
  for (const item of tacTabs) {
    const active = item === tab;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  }
  for (const pane of tacPanes) {
    const active = pane.dataset.pane === mode;
    pane.classList.toggle('is-active', active);
    pane.hidden = !active;
  }
  if (focus) tab.focus({ preventScroll: true });
  trackEvent(`tactical_tab_${mode}`);
}

for (const [index, tab] of tacTabs.entries()) {
  tab.addEventListener('click', () => activateTacTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tacTabs.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + tacTabs.length) % tacTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tacTabs.length - 1;
    else return;
    event.preventDefault();
    activateTacTab(tacTabs[next], true);
  });
}

// Keep the lottery details open on large screens but collapsed on phones, where the page is long.
const lotteryDetails = document.querySelector('.lottery-details');
const phoneLayout = window.matchMedia('(max-width: 700px)');
const syncLotteryDetails = () => { lotteryDetails.open = !phoneLayout.matches; };
phoneLayout.addEventListener('change', syncLotteryDetails);
syncLotteryDetails();

const langMenu = document.querySelector('.lang-menu');
const pageLanguage = document.documentElement.lang.split('-')[0];
for (const option of langMenu.querySelectorAll('[data-lang]')) {
  if (option.dataset.lang === pageLanguage) option.setAttribute('aria-current', 'true');
  option.addEventListener('click', () => {
    try {
      localStorage.setItem('pil-lang', option.dataset.lang);
    } catch {
      // Without storage the choice still applies to the page being opened.
    }
  });
}
document.addEventListener('click', event => {
  if (!langMenu.contains(event.target)) langMenu.open = false;
});
langMenu.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !langMenu.open) return;
  langMenu.open = false;
  langMenu.querySelector('summary').focus();
});

async function loadVisitorStats() {
  try {
    const response = await fetch('https://umami.pkuidv.com/public/pil-stats', {
      credentials: 'omit', signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) return;
    const stats = await response.json();
    if (![stats.todayVisitors, stats.totalPageviews].every(value => Number.isSafeInteger(value) && value >= 0)) return;
    const format = new Intl.NumberFormat(document.documentElement.lang);
    document.querySelector('#today-visitors').textContent = format.format(stats.todayVisitors);
    document.querySelector('#total-pageviews').textContent = format.format(stats.totalPageviews);
    document.querySelector('#visitor-stats').hidden = false;
  } catch {
    // Keep the footer quiet if statistics are unavailable; never show fabricated counts.
  }
}
// Let the page and its initial pageview load before requesting cached aggregate counts.
window.addEventListener('load', () => setTimeout(loadVisitorStats, 1500), { once: true });
