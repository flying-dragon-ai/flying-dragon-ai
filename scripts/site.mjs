#!/usr/bin/env node
// Stage 3: emit the GitHub Pages payload. The site is static; only data.json is generated.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slots, fill } from '../templates/blocks.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const profile = JSON.parse(readFileSync(join(ROOT, 'data', 'profile.json'), 'utf8'));
const voice = JSON.parse(readFileSync(join(ROOT, 'data', 'voice.json'), 'utf8'));

const ctx = slots(profile);
const t = (str) => fill(str, ctx);

const payload = {
  generatedAt: profile.generatedAt,
  user: profile.user,
  voice: {
    tagline: voice.tagline,
    headline: t(voice.headline),
    conclusion: t(voice.conclusion),
    now: voice.now,
    quotes: voice.quotes ?? [],
    footer: voice.footer,
  },
  report: {
    overview: [
      ['公开仓库', String(ctx.ownRepos), `另有 ${ctx.forks} 个 fork`],
      ['Star', String(ctx.stars), `${ctx.ownRepos} 个仓库合计`],
      ['近 12 个月贡献', String(ctx.contributions), `${ctx.commits} commits · ${ctx.prs} PR · ${ctx.issues} issues`],
      ['活跃日', `${ctx.activeDays} / ${ctx.windowDays}`, `峰值 ${ctx.peakDay} 单日 ${ctx.peakCount} 次`],
      ['主力栈', `${ctx.topLang} ${ctx.topLangPct}%`, `共 ${ctx.langCount} 种语言，按字节统计`],
    ],
    objectives: voice.objectives.map((o) => {
      const n = o.cluster ? (profile.clusters.find((x) => x.id === o.cluster)?.repos.length ?? 0) : null;
      return {
        id: o.id,
        title: o.title,
        kr: o.kr,
        data: o.cluster ? `${n} 个仓库` : `${ctx.contributions} 贡献 · ${ctx.activeDays} 活跃日`,
        status: o.cluster ? (n > 0 ? '达成' : '未开始') : ctx.activeDays > 0 ? '进行中' : '未开始',
      };
    }),
    results: voice.results ?? {},
    next: voice.next.map(t),
  },
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
  featured: profile.featured.map((r) => ({
    name: r.name,
    description: r.description,
    language: r.language,
    stars: r.stars,
    url: r.url,
    result: voice.results?.[r.name] ?? (r.stars > 0 ? `${r.stars} ★` : '—'),
  })),
};

mkdirSync(join(ROOT, 'site'), { recursive: true });
writeFileSync(join(ROOT, 'site', 'data.json'), JSON.stringify(payload, null, 2) + '\n');
console.error(`[site] site/data.json (${JSON.stringify(payload).length} bytes)`);
