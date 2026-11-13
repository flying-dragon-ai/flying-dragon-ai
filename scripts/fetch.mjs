#!/usr/bin/env node
// Stage 1 of the pipeline: GitHub CLI -> data/profile.json
// Nothing in this file knows about Markdown. It only records what is true.
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gh, ghGraphQL, whoami } from './gh.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
mkdirSync(DATA, { recursive: true });

// In Actions the token is an installation token: GET /user returns 403.
// Prefer an explicit argument, then the repo owner, then the authenticated user.
const login = process.argv[2] || process.env.GITHUB_REPOSITORY_OWNER || whoami();
const taxonomy = JSON.parse(readFileSync(join(DATA, 'taxonomy.json'), 'utf8'));
const excluded = new Set(taxonomy.exclude || []);

const log = (...a) => console.error('[fetch]', ...a);

// ---------- identity ----------
log('user', login);
const user = gh(['api', `users/${login}`], { json: true });

// ---------- repositories ----------
log('repos');
const repos = gh(
  [
    'repo', 'list', login, '--limit', '300', '--json',
    'name,description,primaryLanguage,stargazerCount,forkCount,isFork,isPrivate,isArchived,pushedAt,createdAt,url,repositoryTopics,homepageUrl,licenseInfo',
  ],
  { json: true },
);

// Private repos cannot be linked from a public profile; keep them out entirely.
const own = repos.filter((r) => !r.isFork && !r.isPrivate && !excluded.has(r.name));
const forks = repos.filter((r) => r.isFork && !r.isPrivate);
log(`own=${own.length} forks=${forks.length}`);

// ---------- real language bytes (not primaryLanguage guesses) ----------
log('languages');
const langBytes = {};
for (const r of own) {
  try {
    const langs = gh(['api', `repos/${login}/${r.name}/languages`], { json: true });
    for (const [name, bytes] of Object.entries(langs)) langBytes[name] = (langBytes[name] || 0) + bytes;
  } catch (e) {
    log('  skip languages', r.name, e.message.split('\n')[0]);
  }
}
const langTotal = Object.values(langBytes).reduce((a, b) => a + b, 0) || 1;
const languages = Object.entries(langBytes)
  .map(([name, bytes]) => ({ name, bytes, pct: +((bytes / langTotal) * 100).toFixed(2) }))
  .sort((a, b) => b.bytes - a.bytes);

// ---------- contributions ----------
log('contributions');
const gql = `
query($login:String!) {
  user(login:$login) {
    contributionsCollection {
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
    repositories(first:100, ownerAffiliations:OWNER, isFork:false, orderBy:{field:PUSHED_AT,direction:DESC}) {
      totalCount
      nodes { name stargazerCount forkCount }
    }
  }
}`;
const g = ghGraphQL(gql, { login }).data.user;
const cc = g.contributionsCollection;
const days = cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
const monthly = {};
for (const d of days) {
  const k = d.date.slice(0, 7);
  monthly[k] = (monthly[k] || 0) + d.contributionCount;
}
const peak = days.reduce((a, d) => (d.contributionCount > a.contributionCount ? d : a), { date: '', contributionCount: 0 });

const contributions = {
  total: cc.contributionCalendar.totalContributions,
  commits: cc.totalCommitContributions,
  issues: cc.totalIssueContributions,
  pullRequests: cc.totalPullRequestContributions,
  reviews: cc.totalPullRequestReviewContributions,
  restricted: cc.restrictedContributionsCount,
  activeDays: days.filter((d) => d.contributionCount > 0).length,
  windowDays: days.length,
  windowStart: days[0]?.date ?? null,
  windowEnd: days.at(-1)?.date ?? null,
  peakDay: peak.date,
  peakCount: peak.contributionCount,
  monthly,
  calendar: days.map((d) => [d.date, d.contributionCount]),
};

// ---------- clustering (declarative, auditable) ----------
// Short ASCII keywords must sit on a word boundary: "dragon" must not match "rag".
function hasWord(hay, k) {
  let i = hay.indexOf(k);
  while (i !== -1) {
    const before = i === 0 ? ' ' : hay[i - 1];
    const after = i + k.length >= hay.length ? ' ' : hay[i + k.length];
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
    i = hay.indexOf(k, i + 1);
  }
  return false;
}

function keywordHit(hay, kw) {
  const k = kw.toLowerCase();
  if (k.endsWith('-') || k.length > 4 || !/^[a-z0-9-]+$/.test(k)) return hay.includes(k);
  return hasWord(hay, k);
}

function classify(repo) {
  const forced = taxonomy.overrides?.[repo.name];
  if (forced) return forced;
  const hay = [repo.name, repo.description || '', ...(repo.repositoryTopics || []).map((t) => t.name || t)]
    .join(' ')
    .toLowerCase();
  for (const c of taxonomy.clusters) {
    if (c.keywords.some((k) => keywordHit(hay, k))) return c.id;
  }
  return 'other';
}

const slim = (r) => ({
  name: r.name,
  description: r.description || '',
  language: r.primaryLanguage?.name ?? null,
  stars: r.stargazerCount,
  forks: r.forkCount,
  pushedAt: r.pushedAt,
  createdAt: r.createdAt,
  url: r.url,
  homepage: r.homepageUrl || '',
  topics: (r.repositoryTopics || []).map((t) => t.name || t),
  license: r.licenseInfo?.spdxId ?? null,
});

const buckets = new Map(taxonomy.clusters.map((c) => [c.id, []]));
buckets.set('other', []);
for (const r of own) buckets.get(classify(r)).push(slim(r));
for (const list of buckets.values()) list.sort((a, b) => b.stars - a.stars || new Date(b.pushedAt) - new Date(a.pushedAt));

const clusters = [...taxonomy.clusters, { id: 'other', title: '其他实验', titleEn: 'Other Experiments', blurb: '未归类的探索。' }]
  .map((c) => ({ ...c, repos: buckets.get(c.id) || [] }))
  .filter((c) => c.repos.length > 0);

const byName = new Map(own.map((r) => [r.name, slim(r)]));
const featured = (taxonomy.featured || []).map((n) => byName.get(n)).filter(Boolean);

// ---------- topic frequency ----------
const topicCount = {};
for (const r of own) for (const t of r.repositoryTopics || []) {
  const n = t.name || t;
  topicCount[n] = (topicCount[n] || 0) + 1;
}
const topics = Object.entries(topicCount).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

// ---------- optional remote assets (only advertise what actually exists) ----------
function hasSnake() {
  try {
    gh(['api', `repos/${login}/${login}/contents/github-contribution-grid-snake.svg?ref=output`], { json: true, quiet: true });
    return true;
  } catch {
    return false;
  }
}
const snake = hasSnake();
log('snake asset', snake);

const profile = {
  generatedAt: new Date().toISOString(),
  source: { tool: 'gh', login },
  user: {
    login: user.login,
    name: user.name || user.login,
    avatarUrl: user.avatar_url,
    bio: user.bio || '',
    company: user.company || '',
    blog: user.blog || '',
    location: user.location || '',
    twitter: user.twitter_username || '',
    followers: user.followers,
    following: user.following,
    publicRepos: user.public_repos,
    publicGists: user.public_gists,
    hireable: !!user.hireable,
    createdAt: user.created_at,
    htmlUrl: user.html_url,
  },
  stats: {
    ownRepos: own.length,
    forks: forks.length,
    totalStars: own.reduce((a, r) => a + r.stargazerCount, 0),
    totalForks: own.reduce((a, r) => a + r.forkCount, 0),
    followers: user.followers,
    languages,
    topics,
  },
  contributions,
  clusters,
  featured,
  assets: { snake },
  forks: forks.map(slim).sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt)),
};

writeFileSync(join(DATA, 'profile.json'), JSON.stringify(profile, null, 2) + '\n');
log('wrote data/profile.json');
log(`  ${own.length} own repos, ${languages.length} languages, ${contributions.total} contributions`);
