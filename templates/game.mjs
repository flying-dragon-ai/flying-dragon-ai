import { trophyBlock, hero, introBlock, statsBlock, heatBlock, langBlock, clustersBlock, footerBlock, trim, box, pad, dw } from './blocks.mjs';

const F = '```';

export default function render(p, v) {
  const c = p.contributions;
  const level = Math.max(1, Math.floor(c.total / 50));
  const xp = c.total % 50;
  const filled = Math.round(xp / 2.5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);

  const card = box([
    `${p.user.name}  LV.${level}  ${p.user.login}`,
    `XP  ${bar}  ${xp}/50`,
    `HP  ${c.activeDays} active days   MP  ${c.commits} commits`,
  ]);

  const achievements = p.clusters
    .map((cl) => `  [${cl.repos.length >= 5 ? '★' : '☆'}] ${pad(cl.title, 22)} ${cl.repos.length} repos`)
    .join('\n');
  const quests = p.featured
    .slice(0, 4)
    .map((r) => `  ▸ ${pad(r.name, 26)} ${trim(r.description, 46)}`)
    .join('\n');

  return `${hero(p, v, { tagline: 'PLAYER CARD' })}

${F}text
${card}

ACHIEVEMENTS
${achievements}

ACTIVE QUESTS
${quests}
${F}

${introBlock(v)}

${statsBlock()}

${trophyBlock()}

${heatBlock()}

${langBlock()}

${clustersBlock(p, { heading: '## 地图' })}

<div align="center">

**[▶ 进入 3D 城市](https://thegitcity.com)** — 贡献数决定楼高，star 数决定窗户亮度。

</div>

${footerBlock(p, v)}
`;
}
