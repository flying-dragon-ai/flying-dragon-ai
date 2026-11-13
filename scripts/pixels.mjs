#!/usr/bin/env node
// Pixel-level glass quality, measured from the actually-rendered SVG.
// The structural score (score.mjs) saturates once the primitives exist; this
// looks at what the browser actually paints, so tuning still has signal.
//
//   interior_variance  colour/luminance variation inside the card (refraction)
//   edge_contrast      border ring vs interior (is the glass edge visible?)
//   sheen_delta        top-left vs bottom-right luminance (specular direction)
//   tint               mean saturation inside (the blobs tinting the glass)

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

const MIME = { '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  if (req.url === '/__blank') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html><body></body></html>');
    return;
  }
  try {
    const p = join(ASSETS, decodeURIComponent(req.url.split('?')[0]));
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(readFileSync(p));
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
  console.log('METRIC glass_px=0');
  console.log('METRIC px_error=playwright-missing');
  server.close();
  process.exit(0);
}

const browser = await chromium.launch();
const page = await browser.newPage();
// Same-origin HTML page: an SVG document would create SVG-namespaced canvases
// and a cross-origin image would taint the canvas.
await page.goto(`http://127.0.0.1:${port}/__blank`);

const measure = (file) =>
  page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);

    const lum = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    const sat = (i) => {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      return mx === 0 ? 0 : (mx - mn) / mx;
    };

    const border = 10;
    let inSum = 0;
    let inSum2 = 0;
    let inN = 0;
    let satSum = 0;
    let tlSum = 0;
    let tlN = 0;
    let brSum = 0;
    let brN = 0;
    let edgeSum = 0;
    let edgeN = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 8) continue;
        const L = lum(i);
        const onEdge = x < border || y < border || x >= width - border || y >= height - border;
        if (onEdge) {
          edgeSum += L;
          edgeN++;
        } else {
          inSum += L;
          inSum2 += L * L;
          inN++;
          satSum += sat(i);
          if (x < width / 2 && y < height / 2) {
            tlSum += L;
            tlN++;
          } else if (x >= width / 2 && y >= height / 2) {
            brSum += L;
            brN++;
          }
        }
      }
    }

    const inMean = inN ? inSum / inN : 0;
    const variance = inN ? Math.max(0, inSum2 / inN - inMean * inMean) : 0;
    const edgeMean = edgeN ? edgeSum / edgeN : 0;
    return {
      interior_variance: Math.sqrt(variance),
      edge_contrast: Math.abs(edgeMean - inMean),
      sheen_delta: Math.abs((tlN ? tlSum / tlN : 0) - (brN ? brSum / brN : 0)),
      tint: inN ? satSum / inN : 0,
    };
  }, `http://127.0.0.1:${port}/${file}`);

const files = ['stats-openbuild-light.svg', 'stats-openbuild-dark.svg', 'lang-bar-openbuild-light.svg', 'heatmap-openbuild-light.svg'];
const acc = { interior_variance: 0, edge_contrast: 0, sheen_delta: 0, tint: 0 };
for (const f of files) {
  const m = await measure(f);
  for (const k of Object.keys(acc)) acc[k] += m[k] / files.length;
}

await browser.close();
server.close();

const n = (v, max) => Math.max(0, Math.min(1, v / max));
const glass_px =
  100 *
  (0.3 * n(acc.interior_variance, 22) +
    0.3 * n(acc.edge_contrast, 26) +
    0.2 * n(acc.sheen_delta, 22) +
    0.2 * n(acc.tint, 0.22));

console.log(`METRIC glass_px=${glass_px.toFixed(2)}`);
console.log(`METRIC px_variance=${acc.interior_variance.toFixed(2)}`);
console.log(`METRIC px_edge=${acc.edge_contrast.toFixed(2)}`);
console.log(`METRIC px_sheen=${acc.sheen_delta.toFixed(2)}`);
console.log(`METRIC px_tint=${acc.tint.toFixed(3)}`);
