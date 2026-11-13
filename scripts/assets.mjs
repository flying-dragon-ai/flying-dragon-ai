#!/usr/bin/env node
// SVG asset generation. Called by render.mjs so README and assets can never disagree.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { langBar, heatmap, statCard, streakCard, typingCard } from './svg.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function writeAssets(profile, voice) {
  const dir = join(ROOT, 'assets');
  mkdirSync(dir, { recursive: true });
  const lines = [
    voice.tagline,
    `${profile.stats.ownRepos} repos · ${profile.stats.languages.slice(0, 3).map((l) => l.name).join(' + ')}`,
    `${profile.contributions.total} contributions · ${profile.contributions.activeDays} active days`,
  ];
  const written = [];
  for (const scheme of ['dark', 'light']) {
    const files = {
      [`lang-bar-${scheme}.svg`]: langBar(profile.stats.languages, scheme),
      [`heatmap-${scheme}.svg`]: heatmap(profile.contributions.calendar, scheme),
      [`stats-${scheme}.svg`]: statCard(profile.stats, profile.contributions, scheme),
      [`streak-${scheme}.svg`]: streakCard(profile.contributions.calendar, scheme),
      [`typing-${scheme}.svg`]: typingCard(lines, scheme),
    };
    for (const [name, body] of Object.entries(files)) {
      writeFileSync(join(dir, name), body);
      written.push(name);
    }
  }
  return written;
}

if (process.argv[1] && process.argv[1].endsWith('assets.mjs')) {
  const { readFileSync } = await import('node:fs');
  const profile = JSON.parse(readFileSync(join(ROOT, 'data', 'profile.json'), 'utf8'));
  const voice = JSON.parse(readFileSync(join(ROOT, 'data', 'voice.json'), 'utf8'));
  console.error(`[assets] ${writeAssets(profile, voice).length} svg files`);
}
