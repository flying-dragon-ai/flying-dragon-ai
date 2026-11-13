import { hero, introBlock, statsBlock, langBlock, clustersBlock, footerBlock, trim } from './blocks.mjs';

const F = '```';

export default function render(p, v) {
  const langs = p.stats.languages.slice(0, 5).map((l) => `'${l.name}'`).join(' | ');
  const repos = p.featured
    .map((r) => `  { name: '${r.name}', stack: '${r.language ?? 'n/a'}', stars: ${r.stars}, note: '${trim(r.description, 40).replace(/'/g, "\'")}' },`)
    .join('\n');

  return `${hero(p, v)}

${introBlock(v)}

${F}ts
interface Engineer {
  handle: '${p.user.login}';
  since: ${p.user.createdAt.slice(0, 4)};
  languages: ${langs};
  repos: ${p.stats.ownRepos};
  contributions12mo: ${p.contributions.total};
  activeDays: ${p.contributions.activeDays};
  peak: { date: '${p.contributions.peakDay}', commits: ${p.contributions.peakCount} };
}

const featured: Repo[] = [
${repos}
];
${F}

${statsBlock()}

${langBlock()}

${clustersBlock(p)}

${footerBlock(p, v)}
`;
}
