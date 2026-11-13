#!/usr/bin/env node
// Render README.md through GitHub's own Markdown API, then screenshot it.
// Requires playwright (optional): NODE_PATH=<project>/node_modules node scripts/preview.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'out');
mkdirSync(OUT, { recursive: true });

const modeArg = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : null;
const mdPath = modeArg ? join(ROOT, 'out', `README.${modeArg}.md`) : join(ROOT, 'README.md');
const md = readFileSync(mdPath, 'utf8');
const html = execFileSync(
  'gh',
  ['api', '-X', 'POST', '/markdown', '-f', `text=${md}`, '-f', 'mode=gfm', '-f', 'context=flying-dragon-ai/flying-dragon-ai'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);
writeFileSync(join(OUT, 'readme.html'), html);

const MIME = { '.svg': 'image/svg+xml', '.png': 'image/png', '.html': 'text/html; charset=utf-8' };
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
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

const page = (scheme) => `<!doctype html><html><head><meta charset="utf-8"><style>
  :root { color-scheme: ${scheme}; }
  body { margin:0; background:${scheme === 'dark' ? '#0d1117' : '#ffffff'};
         color:${scheme === 'dark' ? '#e6edf3' : '#1f2328'};
         font: 16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif; }
  .markdown-body { max-width: 1012px; margin: 0 auto; padding: 32px; }
  .markdown-body h1 { font-size: 2em; border-bottom: 1px solid ${scheme === 'dark' ? '#30363d' : '#d0d7de'}; padding-bottom: .3em; }
  .markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid ${scheme === 'dark' ? '#30363d' : '#d0d7de'}; padding-bottom: .3em; margin-top: 1.6em; }
  .markdown-body table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  .markdown-body th, .markdown-body td { border: 1px solid ${scheme === 'dark' ? '#30363d' : '#d0d7de'}; padding: 6px 13px; }
  .markdown-body th { background: ${scheme === 'dark' ? '#161b22' : '#f6f8fa'}; }
  .markdown-body code { background: ${scheme === 'dark' ? 'rgba(110,118,129,.4)' : 'rgba(175,184,193,.2)'}; padding: .2em .4em; border-radius: 6px; font-size: 85%; }
  .markdown-body pre { background: ${scheme === 'dark' ? '#161b22' : '#f6f8fa'}; padding: 16px; border-radius: 6px; overflow: auto; }
  .markdown-body pre code { background: none; padding: 0; }
  .markdown-body blockquote { border-left: .25em solid ${scheme === 'dark' ? '#30363d' : '#d0d7de'}; color: ${scheme === 'dark' ? '#8b949e' : '#656d76'}; margin: 0; padding: 0 1em; }
  .markdown-body img { max-width: 100%; }
  .markdown-body a { color: #2f8f83; }
</style></head><body><article class="markdown-body">${html}</article></body></html>`;

let chromium;
try {
  // Resolve playwright from PLAYWRIGHT_ROOT when it is not a local dependency.
  const root = process.env.PLAYWRIGHT_ROOT;
  if (root) {
    const { createRequire } = await import('node:module');
    const req = createRequire(join(root, 'noop.cjs'));
    ({ chromium } = req('playwright'));
  } else {
    ({ chromium } = await import('playwright'));
  }
} catch {
  console.error('[preview] playwright not installed; wrote out/readme.html only');
  server.close();
  process.exit(0);
}

const browser = await chromium.launch();
for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1040, height: 1400 }, colorScheme: scheme, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.route('**/__preview.html', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: page(scheme) }));
  await p.goto(`http://127.0.0.1:${port}/__preview.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const file = join(OUT, `preview-${modeArg ?? 'default'}-${scheme}.png`);
  await p.screenshot({ path: file, fullPage: true });
  console.error(`[preview] ${file.replace(ROOT, '.')}`);
  await ctx.close();
}
await browser.close();
server.close();
