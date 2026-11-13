import { hero, introBlock, statsBlock, langBlock, heatBlock, featuredBlock, clustersBlock, dynamicBlock, footerBlock, trim } from './blocks.mjs';

export default function render(p, v) {
  const top = p.stats.languages.slice(0, 3).map((l) => `${l.name} ${l.pct.toFixed(0)}%`).join(' · ');
  const cards = [
    ['现在在做什么', p.featured.slice(0, 3).map((r) => `[${r.name}](${r.url}) — ${trim(r.description, 54)}`).join('<br><br>')],
    ['栈', `${p.stats.languages.slice(0, 5).map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join('<br>')}<br><br><sub>${p.stats.languages.length} 种语言 · 按字节统计</sub>`],
    ['近 12 个月', `${p.contributions.total} contributions<br>${p.contributions.activeDays} active days<br>peak ${p.contributions.peakCount} on ${p.contributions.peakDay}`],
    ['仓库', `${p.stats.ownRepos} own · ${p.stats.forks} forks<br>${p.stats.totalStars} stars<br>[交流群](${p.clusters.find((c) => c.id === 'community')?.repos[0]?.url ?? p.user.htmlUrl})`],
  ];

  const cell = (c) => `<td width="50%" valign="top">

**${c[0]}**

${c[1]}

</td>`;

  const grid = `<table>
<tr>
${cell(cards[0])}
${cell(cards[1])}
</tr>
<tr>
${cell(cards[2])}
${cell(cards[3])}
</tr>
</table>`;

  return `${hero(p, v)}

${introBlock(v)}

${grid}

${statsBlock()}

${heatBlock()}

${langBlock()}

${featuredBlock(p, { limit: 6 })}

${clustersBlock(p)}

${dynamicBlock(p, v)}

${footerBlock(p, v)}
`;
}
