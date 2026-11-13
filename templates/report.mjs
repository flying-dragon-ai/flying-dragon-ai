// 字节跳动汇报体 × Apple keynote 极简
// 结论先行 → 概览 → OKR → 重点项目 → 能力分布 → 交付节奏 → 下一步
// 单色底 + 单一强调色；无边框、无重复区块、大量留白。
import { statsBlock, heatBlock, langBlock, footerBlock, trim, slots, fill, code } from './blocks.mjs';

export default function render(p, v) {
  const ctx = slots(p);
  const c = p.contributions;
  const t = (s) => fill(s, ctx);

  const hero = `<div align="center">

<img src="${p.user.avatarUrl}" width="72" alt="${p.user.login}">

# ${p.user.name}

**${t(v.headline)}**

${v.tagline}

</div>`;

  const okr = v.objectives
    .map((o) => {
      const n = o.cluster ? (p.clusters.find((x) => x.id === o.cluster)?.repos.length ?? 0) : null;
      const data = o.cluster ? `${n} 个仓库` : `${ctx.contributions} 贡献 · ${ctx.activeDays} 活跃日`;
      const status = o.cluster ? (n > 0 ? '达成' : '未开始') : ctx.activeDays > 0 ? '进行中' : '未开始';
      return `**${o.id}**　${o.title}　·　${data}　·　${status}`;
    })
    .join('\n\n');

  const projects = p.featured
    .map((r) => {
      const result = v.results?.[r.name] ?? (r.stars > 0 ? `${r.stars} ★` : '—');
      return `| **[${r.name}](${r.url})** | ${trim(r.description, 70)} | ${result} |`;
    })
    .join('\n');

  const map = p.clusters
    .map((cl) => `**${cl.title}**　${cl.repos.length}　·　${cl.repos.slice(0, 4).map((r) => `[${r.name}](${r.url})`).join('　')}${cl.repos.length > 4 ? `　+${cl.repos.length - 4}` : ''}`)
    .join('\n\n');

  const next = v.next.map((s, i) => `${i + 1}. ${t(s)}`).join('\n');

  return `${hero}

> ${t(v.conclusion)}

${statsBlock()}

## 01　概览

${ctx.ownRepos} 个自有仓库　·　${ctx.forks} 个 fork　·　${ctx.stars} 个 star　·　${ctx.langCount} 种语言　·　since ${ctx.since}

## 02　目标与关键结果

${okr}

## 03　重点项目

| 项目 | 做了什么 | 结果 |
| --- | --- | --- |
${projects}

## 04　能力分布

${langBlock()}

${map}

## 05　交付节奏

${heatBlock()}

## 06　下一步

${next}

${footerBlock(p, v)}
`;
}
