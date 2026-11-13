import { hero, statsBlock, heatBlock, langBlock, clustersBlock, footerBlock, trim, pad, dw } from './blocks.mjs';

const F = '```';

const bar = (pct, width = 24) => {
  const n = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return '█'.repeat(n) + '░'.repeat(width - n);
};

export default function render(p, v) {
  const c = p.contributions;
  const langs = p.stats.languages.slice(0, 6);
  const langLines = langs.map((l) => `${pad(l.name, 12)} ${bar(l.pct)} ${l.pct.toFixed(1).padStart(5)}%`).join('\n');

  const hud = [
    '  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄  ',
    `   ${pad('PLAYER  ' + p.user.name, 52)}`,
    `   ${pad('REPOS   ' + p.stats.ownRepos + '   STARS ' + p.stats.totalStars, 52)}`,
    `   ${pad('COMMITS ' + c.commits + '   PRS ' + c.pullRequests + '   DAYS ' + c.activeDays, 52)}`,
    '  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀  ',
  ].join('\n');

  const quests = p.featured
    .map((r, i) => `  ${String(i + 1).padStart(2, '0')}  ${pad(r.name, 26)} ${trim(r.description, 40)}`)
    .join('\n');

  return `${hero(p, v, { tagline: '▶ PRESS START' })}

${F}text
${hud}

  LANGUAGE
${langLines}

  QUESTS
${quests}
${F}

${statsBlock()}

${heatBlock()}

${langBlock()}

${clustersBlock(p, { heading: '## STAGES' })}

${footerBlock(p, v)}
`;
}
