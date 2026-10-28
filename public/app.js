const platforms = {
  bilibili: { title: '北京大学第五人格赛事', platform: '哔哩哔哩 / Bilibili', instruction: '打开哔哩哔哩，扫一扫关注我们' },
  douyin: { title: '北大第五人格赛事', platform: '抖音 / Douyin', instruction: '打开抖音，扫一扫关注我们' },
  wechat: { title: 'PIL 庄园指北', platform: '微信公众号 / Wechat', instruction: '打开微信，扫一扫关注我们' },
  xiaohongshu: { title: '北京大学第五人格赛事', platform: '小红书 / Rednote', instruction: '打开小红书，扫一扫关注我们' }
};
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
  previousFocus = trigger;
  document.querySelector('#qr-platform').textContent = info.platform;
  document.querySelector('#qr-title').textContent = info.title;
  document.querySelector('#qr-instruction').textContent = info.instruction;
  const image = document.querySelector('#qr-large');
  image.src = `/assets/qr/${key}.png`;
  image.alt = `${info.title}${info.platform.split(' / ')[0]}二维码`;
  const download = document.querySelector('#qr-download');
  download.href = `/assets/qr/${key}.png`;
  download.download = `${info.title}-${key}-二维码.png`;
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
const trackedSections = ['top', 'about', 'tactical', 'channels']
  .map(id => document.getElementById(id))
  .filter(Boolean);

function syncHeaderAndNav() {
  const scrollY = window.scrollY;
  headerShell?.classList.toggle('is-scrolled', scrollY > 18);

  let currentId = 'top';
  const threshold = scrollY + 180;
  for (const section of trackedSections) {
    if (section.id !== 'top' && section.offsetTop <= threshold) {
      currentId = section.id;
    }
  }
  for (const link of navLinks) {
    if (link.dataset.nav === currentId) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

window.addEventListener('scroll', syncHeaderAndNav, { passive: true });
syncHeaderAndNav();

if ('IntersectionObserver' in window) {
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
const tacPreview = document.querySelector('.tactical-preview');

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
  if (tacPreview) tacPreview.dataset.activeMode = mode;
  if (focus) tab.focus({ preventScroll: true });
  trackEvent(`tactical_tab_${mode}`);
}

for (const [index, tab] of tacTabs.entries()) {
  tab.addEventListener('click', () => activateTacTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % tacTabs.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + tacTabs.length) % tacTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tacTabs.length - 1;
    else return;
    event.preventDefault();
    activateTacTab(tacTabs[next], true);
  });
}

async function loadVisitorStats() {
  try {
    const response = await fetch('https://umami.pkuidv.com/public/pil-stats', {
      credentials: 'omit', signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) return;
    const stats = await response.json();
    if (![stats.todayVisitors, stats.totalPageviews].every(value => Number.isSafeInteger(value) && value >= 0)) return;
    const format = new Intl.NumberFormat('zh-CN');
    document.querySelector('#today-visitors').textContent = format.format(stats.todayVisitors);
    document.querySelector('#total-pageviews').textContent = format.format(stats.totalPageviews);
    document.querySelector('#visitor-stats').hidden = false;
  } catch {
    // Keep the footer quiet if statistics are unavailable; never show fabricated counts.
  }
}
// Let the page and its initial pageview load before requesting cached aggregate counts.
window.addEventListener('load', () => setTimeout(loadVisitorStats, 1500), { once: true });
