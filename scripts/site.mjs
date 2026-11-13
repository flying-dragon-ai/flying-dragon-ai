#!/usr/bin/env node
// Stage 3: emit the GitHub Pages payload. The site is static; only data.json is generated.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const profile = JSON.parse(readFileSync(join(ROOT, 'data', 'profile.json'), 'utf8'));
const voice = JSON.parse(readFileSync(join(ROOT, 'data', 'voice.json'), 'utf8'));

const payload = {
  generatedAt: profile.generatedAt,
  user: profile.user,
  voice,
  stats: profile.stats,
  contributions: {
    total: profile.contributions.total,
    commits: profile.contributions.commits,
    pullRequests: profile.contributions.pullRequests,
    issues: profile.contributions.issues,
    activeDays: profile.contributions.activeDays,
    peakDay: profile.contributions.peakDay,
    peakCount: profile.contributions.peakCount,
    calendar: profile.contributions.calendar,
    monthly: profile.contributions.monthly,
  },
  clusters: profile.clusters.map((c) => ({
    id: c.id,
    title: c.title,
    titleEn: c.titleEn,
    blurb: c.blurb,
    repos: c.repos.map((r) => ({ name: r.name, description: r.description, language: r.language, stars: r.stars, url: r.url })),
  })),
  featured: profile.featured.map((r) => ({ name: r.name, description: r.description, language: r.language, stars: r.stars, url: r.url })),
};

mkdirSync(join(ROOT, 'site'), { recursive: true });
writeFileSync(join(ROOT, 'site', 'data.json'), JSON.stringify(payload, null, 2) + '\n');
console.error(`[site] site/data.json (${JSON.stringify(payload).length} bytes)`);
