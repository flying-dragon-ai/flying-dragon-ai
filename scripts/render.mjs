#!/usr/bin/env node
// Stage 2: data/profile.json -> Markdown. Pure function of the data; no network.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeAssets } from './assets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const profile = JSON.parse(readFileSync(join(ROOT, 'data', 'profile.json'), 'utf8'));
const voice = JSON.parse(readFileSync(join(ROOT, 'data', 'voice.json'), 'utf8'));

const args = process.argv.slice(2);
const all = args.includes('--all');
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
const modeArg = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : null;

const MODES = readdirSync(join(ROOT, 'templates'))
  .filter((f) => f.endsWith('.mjs') && f !== 'blocks.mjs')
  .map((f) => f.replace(/\.mjs$/, ''))
  .sort();

const DEFAULT_MODE = 'report';

async function render(mode) {
  const mod = await import(pathToFileURL(join(ROOT, 'templates', `${mode}.mjs`)).href);
  return mod.default(profile, voice);
}

const assets = writeAssets(profile, voice);
console.error(`[render] ${assets.length} svg assets regenerated`);

const targets = all ? MODES : [modeArg || DEFAULT_MODE];
const dir = outDir ? join(ROOT, outDir) : ROOT;
mkdirSync(dir, { recursive: true });

for (const mode of targets) {
  const md = await render(mode);
  const file = all || outDir ? join(dir, `README.${mode}.md`) : join(ROOT, 'README.md');
  writeFileSync(file, md);
  console.error(`[render] ${mode} -> ${file.replace(ROOT, '.')} (${md.length} bytes)`);
}

if (!all && !outDir) {
  // keep a copy of every mode alongside the published one
  mkdirSync(join(ROOT, 'out'), { recursive: true });
  for (const mode of MODES) {
    writeFileSync(join(ROOT, 'out', `README.${mode}.md`), await render(mode));
  }
  console.error(`[render] out/README.<mode>.md for ${MODES.length} modes`);
}
