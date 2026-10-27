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
