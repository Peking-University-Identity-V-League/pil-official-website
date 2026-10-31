import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { localize, locales } from './i18n.mjs';
const project = fileURLToPath(new URL('../', import.meta.url));
const dist = process.argv.includes('--dist');
const root = path.join(project, dist ? 'dist' : 'public');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.jpg': 'image/jpeg', '.xml': 'application/xml; charset=utf-8' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const languagePages = Object.keys(locales);
    const aliases = ['/tactical-friend', '/zhanshuyanlian', ...languagePages.map(code => '/' + code)];
    if (aliases.includes(pathname)) { res.writeHead(301, { Location: pathname + '/' + new URL(req.url, 'http://localhost').search }).end(); return; }
    const language = pathname.slice(1, -1);
    if (!dist && languagePages.includes(language)) { res.writeHead(200, { 'Content-Type': types['.html'], 'Cache-Control': 'no-cache' }).end(localize(await readFile(path.join(root, 'index.html'), 'utf8'), language)); return; }
    const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (!(await stat(file)).isFile()) { res.writeHead(404).end(); return; }
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(bytes);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`Local: http://localhost:${port}`));
