import { hero, statsBlock, heatBlock, langBlock, featuredBlock, clustersBlock, footerBlock, trim } from './blocks.mjs';

export default function render(p, v) {
  const c = p.contributions;
  const facts = [
    ['01', 'IDENTITY', `${p.user.name} / ${p.user.login} / since ${p.user.createdAt.slice(0, 4)}`],
    ['02', 'DISCIPLINE', v.tagline],
    ['03', 'OUTPUT', `${p.stats.ownRepos} repositories · ${p.stats.forks} forks · ${p.stats.totalStars} stars`],
    ['04', 'CADENCE', `${c.total} contributions · ${c.activeDays} active days · peak ${c.peakCount}`],
    ['05', 'STACK', p.stats.languages.slice(0, 4).map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(' · ')],
  ];

  const grid = facts.map(([n, k, val]) => `| **${n}** | **${k}** | ${val} |`).join('\n');

  return `${hero(p, v, { tagline: v.tagline.toUpperCase() })}

---

| # | | |
| --- | --- | --- |
${grid}

---

## 01 — POSITION

${v.intro.join('\n\n')}

> ${v.now}

---

## 02 — WORK

${featuredBlock(p, { limit: 6, heading: '' }).replace(/^\n+/, '')}

---

## 03 — INDEX

${clustersBlock(p, { heading: '' }).replace(/^\n+/, '')}

---

## 04 — DATA

${statsBlock()}

${heatBlock()}

${langBlock()}

${footerBlock(p, v)}
`;
}
