#!/usr/bin/env node
// Screenshot the Pages site. PLAYWRIGHT_ROOT=<dir with node_modules/playwright> node scripts/preview-site.mjs
import { readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const OUT = join(ROOT, 'out');
mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const p = join(SITE, rel === '/' ? 'index.html' : rel);
  try {
    const body = readFileSync(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('nope');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

let chromium;
try {
  const root = process.env.PLAYWRIGHT_ROOT;
  if (root) {
    const { createRequire } = await import('node:module');
    ({ chromium } = createRequire(join(root, 'noop.cjs'))('playwright'));
  } else {
    ({ chromium } = await import('playwright'));
  }
} catch {
  console.error('[preview-site] playwright not installed');
  server.close();
  process.exit(0);
}

const browser = await chromium.launch();
for (const [label, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  // walk the page so IntersectionObserver reveals everything before capture
  const total = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < total; y += Math.round(height * 0.8)) {
    await p.evaluate((v) => scrollTo(0, v), y);
    await p.waitForTimeout(180);
  }
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(600);
  await p.screenshot({ path: join(OUT, `site-${label}.png`), fullPage: true });
  console.error(`[preview-site] ${label} -> out/site-${label}.png${errors.length ? ` ERRORS: ${errors.join(' | ')}` : ' (no console errors)'}`);
  await ctx.close();
}
await browser.close();
server.close();
