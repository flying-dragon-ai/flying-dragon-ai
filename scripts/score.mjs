#!/usr/bin/env node
// Liquid Glass Fidelity (lgf) — deterministic score for the rendered SVG assets.
//
// The metric is a PROXY. It measures the structural properties that actually
// produce the iOS 26 look inside an <img>-loaded SVG (the only surface GitHub
// lets us style). It is not a substitute for looking at the render: if lgf goes
// up but the card looks worse, the round is discarded.
//
// Components (weights sum to 1):
//   translucency .20  layered alpha surfaces, background shows through
//   specular     .20  diagonal white low-alpha sheen across the glass
//   refraction   .15  feGaussianBlur backdrop
//   rim          .10  light top-edge stroke (light comes from above)
//   depth        .12  multiple shadow layers + multi-stop gradients
//   radius       .08  corner radius / card size, iOS 26 squircle ratio
//   palette      .10  distance from the official Apple system colours
//   motion       .05  animated light flow

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

const APPLE = [
  '#007aff', '#af52de', '#f2f2f7', '#ffffff', '#000000', '#8e8e93', '#1c1c1e',
  '#34c759', '#ff9500', '#ff3b30', '#0a84ff', '#bf5af2', '#30d158', '#ff9f0a',
  '#ff453a', '#e5e5ea', '#d1d1d6', '#c7c7cc', '#aeaeb2', '#5ac8fa', '#64d2ff',
  '#38383a', '#2c2c2e', '#48484a', '#636366', '#3a3a3c', '#1f1f22', '#161618',
];

const hex2rgb = (h) => {
  const s = h.replace('#', '');
  const v = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};

const dist = (a, b) => {
  const [r1, g1, b1] = hex2rgb(a);
  const [r2, g2, b2] = hex2rgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// ---------- read the hero cards ----------
const files = readdirSync(ASSETS).filter((f) => f.endsWith('.svg'));
const hero = ['stats-openbuild-light.svg', 'stats-openbuild-dark.svg', 'lang-bar-openbuild-light.svg', 'heatmap-openbuild-light.svg'];
const src = hero.map((f) => readFileSync(join(ASSETS, f), 'utf8')).join('\n');
const all = files.map((f) => readFileSync(join(ASSETS, f), 'utf8')).join('\n');

// ---------- translucency ----------
// Count distinct translucent surfaces: rgba fills with alpha < 1, or gradient
// stops that are rgba with alpha < 1.
const rgbaFills = [...src.matchAll(/fill="rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0?\.\d+|0)\)"/g)].map((m) => Number(m[1]));
const translucentStops = [...src.matchAll(/stop-color="rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0?\.\d+|0)\)"/g)].map((m) => Number(m[1]));
const translucentLayers = rgbaFills.filter((a) => a < 0.85).length + translucentStops.filter((a) => a < 0.85).length;
const translucency = clamp01(translucentLayers / 6);

// ---------- specular ----------
// A diagonal linear gradient containing a near-white stop at low alpha, used as
// an overlay rect that covers a meaningful part of the card.
const grads = [...src.matchAll(/<linearGradient[^>]*id="([^"]+)"[^>]*x1="([^"]+)"[^>]*y1="([^"]+)"[^>]*x2="([^"]+)"[^>]*y2="([^"]+)"[^>]*>([\s\S]*?)<\/linearGradient>/g)];
let specular = 0;
for (const g of grads) {
  const [, id, x1, y1, x2, y2, body] = g;
  const diagonal = x1 !== x2 && y1 !== y2;
  const whiteStops = [...body.matchAll(/stop-color="(rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*(0?\.\d+)\)|#fff(?:fff)?)"/g)];
  const lowAlphaWhite = whiteStops.some((m) => (m[2] ? Number(m[2]) <= 0.4 : true));
  if (diagonal && lowAlphaWhite) {
    const used = new RegExp(`fill="url\\(#${id}\\)"`).test(src);
    specular = Math.max(specular, used ? 1 : 0.5);
  }
}

// ---------- refraction ----------
const blurs = [...src.matchAll(/feGaussianBlur[^>]*stdDeviation="([\d.]+)"/g)].map((m) => Number(m[1]));
const maxBlur = blurs.length ? Math.max(...blurs) : 0;
const refraction = maxBlur >= 8 ? 1 : maxBlur >= 4 ? 0.6 : maxBlur > 0 ? 0.3 : 0;

// ---------- rim ----------
// Card rect carries a stroke; a light stroke at low alpha is the top-edge rim.
const cardRects = [...src.matchAll(/<rect[^>]*rx="(\d+)"[^>]*>/g)].map((m) => m[0]);
let rim = 0;
for (const r of cardRects) {
  const stroke = r.match(/stroke="([^"]+)"/);
  if (!stroke) continue;
  const s = stroke[1];
  const alpha = s.startsWith('rgba') ? Number(s.split(',').pop().replace(')', '')) : 1;
  const light = s.includes('255') || /#(fff|ffffff|e5e5ea|d1d1d6)/i.test(s);
  rim = Math.max(rim, light && alpha <= 0.5 ? 1 : 0.5);
}

// ---------- depth ----------
const shadowLayers = (src.match(/feDropShadow/g) || []).length;
const stopCounts = [...src.matchAll(/<linearGradient[\s\S]*?<\/linearGradient>/g)].map((m) => (m[0].match(/<stop/g) || []).length);
const maxStops = stopCounts.length ? Math.max(...stopCounts) : 0;
const depth = 0.5 * clamp01(shadowLayers / 2) + 0.5 * clamp01(maxStops / 4);

// ---------- radius ----------
const radii = [...src.matchAll(/<rect[^>]*width="(\d+)"[^>]*height="(\d+)"[^>]*rx="(\d+)"/g)].map((m) => ({
  w: Number(m[1]),
  h: Number(m[2]),
  rx: Number(m[3]),
}));
const radiusRatio = radii.length ? Math.max(...radii.map((r) => r.rx / Math.min(r.w, r.h))) : 0;
const radius = clamp01(radiusRatio / 0.12);

// ---------- palette ----------
const hexes = [...new Set([...all.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase()))];
const paletteDist = hexes.length
  ? hexes.reduce((a, h) => a + Math.min(...APPLE.map((p) => dist(h, p))), 0) / hexes.length
  : 60;
const palette = clamp01(1 - paletteDist / 60);

// ---------- motion ----------
const animates = (src.match(/<animate\b/g) || []).length;
const motion = clamp01(animates / 2);

// ---------- composite ----------
const parts = {
  translucency: [translucency, 0.2],
  specular: [specular, 0.2],
  refraction: [refraction, 0.15],
  rim: [rim, 0.1],
  depth: [depth, 0.12],
  radius: [radius, 0.08],
  palette: [palette, 0.1],
  motion: [motion, 0.05],
};
const lgf = 100 * Object.values(parts).reduce((a, [v, w]) => a + v * w, 0);

console.log(`METRIC lgf=${lgf.toFixed(2)}`);
for (const [k, [v, w]] of Object.entries(parts)) {
  console.log(`METRIC ${k}=${(v * 100).toFixed(1)}`);
}
console.log(`METRIC palette_dist=${paletteDist.toFixed(1)}`);
console.log(`METRIC translucent_layers=${translucentLayers}`);
console.log(`METRIC max_blur=${maxBlur}`);
console.log(`METRIC shadow_layers=${shadowLayers}`);
console.log(`METRIC max_stops=${maxStops}`);
console.log(`METRIC radius_ratio=${radiusRatio.toFixed(3)}`);
console.log(`METRIC animates=${animates}`);
