import { hero, statsBlock, heatBlock, langBlock, featuredBlock, clustersBlock, footerBlock, trim, box, pad } from './blocks.mjs';

const F = '```';
const T = 'lavender';

export default function render(p, v) {
  const c = p.contributions;
  const lv = Math.max(1, Math.floor(c.total / 50));
  const attrs = [
    ['语言', p.stats.languages.slice(0, 3).map((l) => `${l.name} ${l.pct.toFixed(0)}%`).join(' / ')],
    ['仓库', `${p.stats.ownRepos} own · ${p.stats.forks} forks`],
    ['贡献', `${c.total} / 12mo · ${c.activeDays} active days`],
    ['峰值', `${c.peakDay} · ${c.peakCount} commits`],
  ];

  const sheet = `<table>
<tr>
<td width="34%" valign="top">

**角色卡**

\`\`\`text
${box([`名  ${p.user.name}`, `职  agent 工程师`, `阵  ${[...p.clusters].sort((a, b) => b.repos.length - a.repos.length)[0]?.title ?? '—'}`, `LV  ${lv}`])}
\`\`\`

</td>
<td width="66%" valign="top">

**属性**

| | |
| --- | --- |
${attrs.map(([k, val]) => `| **${k}** | ${val} |`).join('\n')}

</td>
</tr>
</table>`;

  const skills = p.clusters
    .map((cl) => `- **${cl.title}** · ${cl.repos.length} 件 — ${cl.blurb}`)
    .join('\n');

  const gallery = p.featured
    .map((r) => `| **[${r.name}](${r.url})** | ${trim(r.description, 84)} | ${r.language ?? '—'} |`)
    .join('\n');

  return `${hero(p, v, { tagline: '角色卡 · CHARACTER SHEET' })}

${sheet}

## 技能树

${skills}

## 图鉴

| 作品 | 简介 | 语言 |
| --- | --- | --- |
${gallery}

${statsBlock(T)}

${heatBlock(T)}

${langBlock(T)}

${clustersBlock(p, { heading: '## 阵营' })}

${footerBlock(p, v)}
`;
}
