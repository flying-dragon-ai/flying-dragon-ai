// 字节跳动汇报风格：结论先行 → 概览 → OKR → 重点项目 → 能力分布 → 交付节奏 → 下一步
import { hero, statsBlock, heatBlock, langBlock, trophyBlock, clustersBlock, footerBlock, trim, slots, fill, pad, dw } from './blocks.mjs';

const F = '```';

export default function render(p, v) {
  const ctx = slots(p);
  const c = p.contributions;
  const t = (s) => fill(s, ctx);

  const overview = [
    ['公开仓库', `${ctx.ownRepos}`, `另有 ${ctx.forks} 个 fork`],
    ['Star', `${ctx.stars}`, `${ctx.ownRepos} 个仓库合计`],
    ['近 12 个月贡献', `${ctx.contributions}`, `${ctx.commits} commits · ${ctx.prs} PR · ${ctx.issues} issues`],
    ['活跃日', `${ctx.activeDays} / ${ctx.windowDays}`, `峰值 ${ctx.peakDay} 单日 ${ctx.peakCount} 次`],
    ['主力栈', `${ctx.topLang} ${ctx.topLangPct}%`, `共 ${ctx.langCount} 种语言，按字节统计`],
  ];

  const okr = v.objectives
    .map((o) => {
      const n = o.cluster ? (p.clusters.find((x) => x.id === o.cluster)?.repos.length ?? 0) : null;
      const data = o.cluster
        ? `${n} 个仓库`
        : `${ctx.contributions} 贡献 · ${ctx.activeDays} 活跃日`;
      const status = o.cluster ? (n > 0 ? '达成' : '未开始') : ctx.activeDays > 0 ? '进行中' : '未开始';
      return `| **${o.id}** | ${o.title} | ${o.kr} | ${data} | ${status} |`;
    })
    .join('\n');

  const projects = p.featured
    .map((r) => {
      const result = v.results?.[r.name] ?? (r.stars > 0 ? `${r.stars} ★` : '—');
      return `| **[${r.name}](${r.url})** | ${trim(r.description, 76)} | ${result} | ${r.language ?? '—'} |`;
    })
    .join('\n');

  const next = v.next.map((s, i) => `${i + 1}. ${t(s)}`).join('\n');

  return `${hero(p, v, { tagline: t(v.headline) })}

> **结论**　${t(v.conclusion)}

---

## 一、概览

| 指标 | 数值 | 口径 |
| --- | --- | --- |
${overview.map(([k, val, note]) => `| **${k}** | ${val} | ${note} |`).join('\n')}

${statsBlock()}

${trophyBlock()}

---

## 二、目标与关键结果

| O | 目标 | 关键结果 | 数据 | 状态 |
| --- | --- | --- | --- | --- |
${okr}

---

## 三、重点项目

| 项目 | 做了什么 | 结果 | 栈 |
| --- | --- | --- | --- |
${projects}

---

## 四、能力分布

${langBlock()}

${clustersBlock(p, { heading: '### 仓库地图' })}

---

## 五、交付节奏

${heatBlock()}

${F}text
${[
  `近 12 个月   ${c.windowStart} → ${c.windowEnd}`,
  `贡献总数     ${c.total}`,
  `提交         ${c.commits}`,
  `PR / Issue   ${c.pullRequests} / ${c.issues}`,
  `活跃日       ${c.activeDays} / ${c.windowDays}`,
  `峰值         ${c.peakDay} · ${c.peakCount}`,
].join('\n')}
${F}

---

## 六、下一步

${next}

${footerBlock(p, v)}
`;
}
