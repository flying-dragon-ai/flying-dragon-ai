#!/usr/bin/env node
// Gate: every local asset exists, every remote image/link answers 2xx.
// Behind a proxy: NODE_USE_ENV_PROXY=1 HTTPS_PROXY=http://127.0.0.1:10808 node scripts/verify.mjs
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(ROOT, 'README.md'), 'utf8');

const local = [...md.matchAll(/(?:src|srcset)="(?!https?:)([^"]+)"/g)].map((m) => m[1]);
const remote = [...md.matchAll(/(?:src|srcset)="(https?:[^"]+)"/g)].map((m) => m[1]);
const links = [...md.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => m[1]);

const uniq = (a) => [...new Set(a)];
const localFiles = uniq(local);
const remoteUrls = uniq([...remote, ...links]);

let fail = 0;

console.log(`local assets: ${localFiles.length}`);
for (const f of localFiles) {
  const ok = existsSync(join(ROOT, f));
  if (!ok) fail++;
  console.log(`  ${ok ? 'OK  ' : 'MISS'} ${f}`);
}

// Consistency gate: the rendered SVGs must agree with data/profile.json.
const profile = JSON.parse(readFileSync(join(ROOT, 'data', 'profile.json'), 'utf8'));
const statsSvg = readFileSync(join(ROOT, 'assets', 'stats-openbuild-dark.svg'), 'utf8');
const expected = [
  profile.stats.ownRepos,
  profile.stats.totalStars,
  profile.contributions.commits,
  profile.contributions.pullRequests,
  profile.contributions.activeDays,
];
const rendered = [...statsSvg.matchAll(/>([0-9]+)<\/text>/g)].map((m) => Number(m[1]));
const same = expected.length === rendered.length && expected.every((v, i) => v === rendered[i]);
if (!same) fail++;
console.log(`stats card: ${same ? 'OK  ' : 'STALE'} rendered=[${rendered}] expected=[${expected}]`);

const langSvg = readFileSync(join(ROOT, 'assets', 'lang-bar-openbuild-dark.svg'), 'utf8');
const langRendered = [...langSvg.matchAll(/>([0-9.]+)%</g)].map((m) => Number(m[1]));
const langExpected = profile.stats.languages.slice(0, 8).map((l) => Number(l.pct.toFixed(1)));
const langSame = langExpected.every((v, i) => Math.abs(v - (langRendered[i] ?? -1)) < 0.06);
if (!langSame) fail++;
console.log(`language bar: ${langSame ? 'OK  ' : 'STALE'} rendered=[${langRendered.slice(0, 4)}] expected=[${langExpected.slice(0, 4)}]`);

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'profile-verify' } });
    return res.status;
  } catch (e) {
    return `ERR ${e.name}`;
  } finally {
    clearTimeout(timer);
  }
}

console.log(`remote urls: ${remoteUrls.length}`);
const results = await Promise.all(remoteUrls.map(async (u) => [u, await probe(u)]));
for (const [u, status] of results) {
  const ok = typeof status === 'number' && status >= 200 && status < 400;
  if (!ok) fail++;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${status} ${u.slice(0, 110)}`);
}

console.log(fail === 0 ? '\nverify: PASS' : `\nverify: ${fail} problem(s)`);
process.exit(fail === 0 ? 0 : 1);
