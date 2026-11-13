import { hero, introBlock, langBlock, clustersBlock, footerBlock } from './blocks.mjs';

const F = '```';

export default function render(p, v) {
  const top = p.stats.languages.slice(0, 4).map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join('  ');
  const session = [
    `$ gh api users/${p.user.login} --jq '.name,.public_repos,.followers'`,
    p.user.name,
    String(p.stats.ownRepos),
    String(p.user.followers),
    '',
    `$ gh repo list ${p.user.login} --limit 300 --json name | jq length`,
    String(p.stats.ownRepos + p.stats.forks),
    '',
    '$ gh api graphql -f query=@contrib.graphql',
    `contributions(12mo)  ${p.contributions.total}`,
    `commits              ${p.contributions.commits}`,
    `pull requests        ${p.contributions.pullRequests}`,
    `issues               ${p.contributions.issues}`,
    `active days          ${p.contributions.activeDays} / ${p.contributions.windowDays}`,
    `peak day             ${p.contributions.peakDay} (${p.contributions.peakCount})`,
    '',
    '$ tokei --sort code',
    top,
    '',
    '$ ls ~/work',
    p.clusters.map((c) => c.id + '/').join('  '),
  ].join('\n');

  return `${hero(p, v, { tagline: '终端里长出来的主页' })}

${introBlock(v)}

${F}console
${session}
${F}

${langBlock()}

${clustersBlock(p)}

${footerBlock(p, v)}
`;
}
