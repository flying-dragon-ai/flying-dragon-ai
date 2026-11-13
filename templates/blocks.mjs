// Shared primitives. Every mode composes from these, so the design system is one thing, not six copies.

export const code = (s) => '`' + s + '`';

export function trim(s, n = 96) {
  if (!s) return '';
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > n ? flat.slice(0, n - 1).trimEnd() + '…' : flat;
}

export function pic(base, alt, width, theme = 'teal') {
  return `<div align="center"><picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/${base}-${theme}-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/${base}-${theme}-light.svg">
  <img src="assets/${base}-${theme}-light.svg" alt="${alt}" width="${width}">
</picture></div>`;
}

export function hero(p, v, { tagline } = {}) {
  const meta = [p.user.hireable ? code('open to work') : null, code(p.user.login), `since ${p.user.createdAt.slice(0, 4)}`]
    .filter(Boolean)
    .join(' · ');
  return `<div align="center">

<img src="${p.user.avatarUrl}" width="104" alt="${p.user.login}">

# ${p.user.name}

**${tagline || v.tagline}**

${meta}

</div>`;
}

export function introBlock(v, { heading = '## 我是谁' } = {}) {
  return `${heading}

${v.intro.join('\n\n')}

> ${v.now}`;
}

export function statsBlock(theme = 'teal') {
  return pic('stats', 'repos / stars / commits / PRs / active days', 720, theme);
}

export function langBlock(theme = 'teal') {
  return pic('lang-bar', 'language mix by bytes', 720, theme);
}

export function heatBlock(theme = 'teal') {
  return pic('heatmap', 'contribution heatmap, last 12 months', 790, theme);
}

export function featuredBlock(p, { limit = 6, heading = '## 在做什么' } = {}) {
  const rows = p.featured.slice(0, limit).map((r) => {
    const star = r.stars > 0 ? ` ★${r.stars}` : '';
    return `| **[${r.name}](${r.url})**${star} | ${trim(r.description, 110)} | ${r.language ?? '—'} |`;
  });
  return `${heading}

| 仓库 | 说明 | 栈 |
| --- | --- | --- |
${rows.join('\n')}`;
}

export function clustersBlock(p, { heading = '## 仓库地图' } = {}) {
  const rows = p.clusters.map((c) => {
    const links = c.repos.slice(0, 6).map((r) => `[${r.name}](${r.url})`).join(' · ');
    const more = c.repos.length > 6 ? ` · +${c.repos.length - 6}` : '';
    return `| **${c.title}** | ${c.repos.length} | ${links}${more} |`;
  });
  return `${heading}

| 方向 | # | 仓库 |
| --- | --- | --- |
${rows.join('\n')}`;
}

export function dynamicBlock(p, v, { heading = '## 动态', theme = 'teal' } = {}) {
  const u = p.user.login;
  const parts = [pic('typing', 'typing banner', 720, theme)];
  if (p.assets?.snake) {
    parts.push(`<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/${u}/${u}/output/github-contribution-grid-snake-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/${u}/${u}/output/github-contribution-grid-snake.svg">
  <img src="https://raw.githubusercontent.com/${u}/${u}/output/github-contribution-grid-snake.svg" alt="contribution snake" width="720">
</picture>`);
  }
  parts.push(pic('streak', 'current streak / longest streak / total', 720, theme));
  return `${heading}

<div align="center">

${parts.join('\n\n')}

</div>`;
}

export function footerBlock(p, v) {
  return `<div align="center">

${v.footer}

**[${p.user.login}](${p.user.htmlUrl})** · ${p.stats.ownRepos} repos · ${p.stats.totalStars} stars · ${p.contributions.total} contributions / 12mo

<sub>README 由 ${code('gh')} 拉取真实数据后渲染 · 最后更新 ${p.generatedAt.slice(0, 10)}</sub>

</div>`;
}

// ---------- monospace box helpers (CJK is double-width; padEnd lies) ----------
export function dw(s) {
  let w = 0;
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    const wide =
      (c >= 0x1100 && c <= 0x115f) ||
      (c >= 0x2e80 && c <= 0xa4cf) ||
      (c >= 0xac00 && c <= 0xd7a3) ||
      (c >= 0xf900 && c <= 0xfaff) ||
      (c >= 0xfe30 && c <= 0xfe4f) ||
      (c >= 0xff00 && c <= 0xff60) ||
      (c >= 0xffe0 && c <= 0xffe6);
    w += wide ? 2 : 1;
  }
  return w;
}

export function pad(s, n) {
  return String(s) + ' '.repeat(Math.max(0, n - dw(s)));
}

export function box(lines, width) {
  const w = width ?? Math.max(...lines.map(dw)) + 2;
  const top = '┌' + '─'.repeat(w) + '┐';
  const bot = '└' + '─'.repeat(w) + '┘';
  const body = lines.map((l) => '│ ' + pad(l, w - 2) + ' │').join('\n');
  return [top, body, bot].join('\n');
}
