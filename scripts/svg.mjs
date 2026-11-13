// Self-rendered SVG cards. No third-party renderer, no rate limit, no 402.
// Every number here comes from data/profile.json, which came from `gh`.
//
// Visual rule: monochrome base (Apple system greys) + exactly one accent colour
// (OpenBuild mint, measured from https://openbuild.xyz/ on 2026-11-13).
// Typography: thin display weights (200) paired with bold micro-labels (600).

export const PALETTES = {
  openbuild: {
    dark: {
      accent: '#01DB83',
      accentSoft: '#01DB83',
      onAccent: '#000000',
      cardBg: '#000000',
      cardText: '#F5F5F7',
      ramp: ['#1F2A25', '#0E4A33', '#01DB83', '#7CF0BE'],
      categorical: ['#01DB83', '#F5F5F7', '#86868B', '#D2D2D7', '#48484A', '#2C2C2E', '#6E6E73', '#3A3A3C', '#1C1C1E'],
    },
    light: {
      accent: '#00A05C',
      accentSoft: '#00A05C',
      onAccent: '#FFFFFF',
      cardBg: '#FFFFFF',
      cardText: '#1D1D1F',
      ramp: ['#E3F7EC', '#A8E8C8', '#3FD79A', '#00A05C'],
      categorical: ['#00A05C', '#1D1D1F', '#86868B', '#D2D2D7', '#48484A', '#6E6E73', '#A1A1A6', '#3A3A3C', '#C7C7CC'],
    },
  },
  lavender: {
    dark: {
      accent: '#CB9BFA',
      accentSoft: '#CB9BFA',
      onAccent: '#000000',
      cardBg: '#000000',
      cardText: '#F5F5F7',
      ramp: ['#241A33', '#4A2E6B', '#CB9BFA', '#E0C4FC'],
      categorical: ['#CB9BFA', '#F5F5F7', '#86868B', '#D2D2D7', '#48484A', '#2C2C2E', '#6E6E73', '#3A3A3C', '#1C1C1E'],
    },
    light: {
      accent: '#7B3FB0',
      accentSoft: '#7B3FB0',
      onAccent: '#FFFFFF',
      cardBg: '#FFFFFF',
      cardText: '#1D1D1F',
      ramp: ['#F1E6FD', '#D9B8FB', '#B77DF0', '#7B3FB0'],
      categorical: ['#7B3FB0', '#1D1D1F', '#86868B', '#D2D2D7', '#48484A', '#6E6E73', '#A1A1A6', '#3A3A3C', '#C7C7CC'],
    },
  },
};

export const THEME = {
  dark: { bg: '#000000', panel: '#0A0A0A', border: '#1F1F22', text: '#F5F5F7', muted: '#86868B', empty: '#161618' },
  light: { bg: '#FFFFFF', panel: '#FAFAFC', border: '#E8E8ED', text: '#1D1D1F', muted: '#86868B', empty: '#F0F0F3' },
};

// Single quotes: this string is interpolated into a double-quoted SVG attribute.
export const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', 'Segoe UI', sans-serif";
export const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

const pal = (theme, scheme) => (PALETTES[theme] ?? PALETTES.openbuild)[scheme] ?? PALETTES.openbuild.dark;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">\n${body}\n</svg>\n`;

// ---------- metric row (no frame: sits directly on the page) ----------
function metricRow(items, scheme, theme, { numberSize = 40, height = 116 } = {}) {
  const t = THEME[scheme];
  const P = pal(theme, scheme);
  const W = 720;
  const colW = W / items.length;
  const body = items
    .map(([label, value], i) => {
      const cx = i * colW + colW / 2;
      return `  <rect x="${(cx - 12).toFixed(1)}" y="16" width="24" height="2" rx="1" fill="${P.accent}"/>
  <text x="${cx.toFixed(1)}" y="${16 + numberSize + 14}" text-anchor="middle" font-family="${FONT}" font-size="${numberSize}" font-weight="200" fill="${t.text}" letter-spacing="-1.5">${value}</text>
  <text x="${cx.toFixed(1)}" y="${16 + numberSize + 38}" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="600" fill="${t.muted}" letter-spacing="1.6">${label}</text>`;
    })
    .join('\n');
  return svg(W, height, body);
}

export function statCard(stats, contributions, scheme = 'dark', theme = 'openbuild') {
  return metricRow(
    [
      ['REPOS', stats.ownRepos],
      ['STARS', stats.totalStars],
      ['COMMITS', contributions.commits],
      ['PRS', contributions.pullRequests],
      ['ACTIVE DAYS', contributions.activeDays],
    ],
    scheme,
    theme,
  );
}

export function streakCard(calendar, scheme = 'dark', theme = 'openbuild') {
  let longest = 0;
  let run = 0;
  for (const [, c] of calendar) {
    run = c > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }
  let current = 0;
  for (let i = calendar.length - 1; i >= 0; i--) {
    if (calendar[i][1] > 0) current++;
    else break;
  }
  const total = calendar.reduce((a, [, c]) => a + c, 0);
  return metricRow(
    [
      ['CURRENT STREAK', `${current}d`],
      ['LONGEST STREAK', `${longest}d`],
      ['TOTAL', total],
    ],
    scheme,
    theme,
    { numberSize: 36, height: 104 },
  );
}

// ---------- language bar: one accent, everything else grey ----------
export function langBar(languages, scheme = 'dark', theme = 'openbuild') {
  const t = THEME[scheme];
  const P = pal(theme, scheme);
  const top = languages.slice(0, 6);
  const restPct = languages.slice(6).reduce((a, l) => a + l.pct, 0);
  const rows = restPct > 0.05 ? [...top, { name: 'Other', pct: +restPct.toFixed(2) }] : top;

  const W = 720;
  const barY = 18;
  const barH = 6;
  const barW = W;
  const greys = scheme === 'dark' ? ['#F5F5F7', '#86868B', '#6E6E73', '#48484A', '#3A3A3C', '#2C2C2E'] : ['#1D1D1F', '#86868B', '#A1A1A6', '#C7C7CC', '#D2D2D7', '#E8E8ED'];

  let x = 0;
  const segs = rows
    .map((l, i) => {
      const w = Math.max(2, (l.pct / 100) * barW);
      const fill = i === 0 ? P.accent : greys[(i - 1) % greys.length];
      const seg = `<rect x="${x.toFixed(2)}" y="${barY}" width="${Math.max(1, w - 2).toFixed(2)}" height="${barH}" rx="3" fill="${fill}"/>`;
      x += w;
      return seg;
    })
    .join('\n  ');

  const legend = rows
    .slice(0, 4)
    .map((l, i) => {
      const fill = i === 0 ? P.accent : greys[(i - 1) % greys.length];
      return `<circle cx="${i * 180 + 4}" cy="${barY + barH + 22}" r="3.5" fill="${fill}"/>
  <text x="${i * 180 + 14}" y="${barY + barH + 26}" font-family="${FONT}" font-size="12" font-weight="500" fill="${t.text}">${esc(l.name)}</text>
  <text x="${i * 180 + 14 + l.name.length * 7 + 8}" y="${barY + barH + 26}" font-family="${FONT}" font-size="12" font-weight="400" fill="${t.muted}">${l.pct.toFixed(1)}%</text>`;
    })
    .join('\n  ');

  const more = languages.length > 4 ? `<text x="${W}" y="${barY + barH + 26}" text-anchor="end" font-family="${FONT}" font-size="12" font-weight="400" fill="${t.muted}">+${languages.length - 4} more</text>` : '';
  return svg(W, barY + barH + 44, `  ${segs}\n  ${legend}\n  ${more}`);
}

// ---------- contribution heatmap ----------
export function heatmap(calendar, scheme = 'dark', theme = 'openbuild') {
  const t = THEME[scheme];
  const P = pal(theme, scheme);
  const weeks = [];
  for (let i = 0; i < calendar.length; i += 7) weeks.push(calendar.slice(i, i + 7));
  const cell = 11;
  const gap = 3;
  const top = 34;
  const W = weeks.length * (cell + gap);
  const H = top + 7 * (cell + gap) + 22;

  const levels = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);
  const fills = [t.empty, ...P.ramp];

  let cells = '';
  weeks.forEach((week, wi) => {
    week.forEach(([date, count], di) => {
      const x = wi * (cell + gap);
      const y = top + di * (cell + gap);
      cells += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2.5" fill="${fills[levels(count)]}"><title>${date}: ${count}</title></rect>`;
    });
  });

  const total = calendar.reduce((a, [, c]) => a + c, 0);
  const active = calendar.filter(([, c]) => c > 0).length;
  const head = `  <text x="0" y="14" font-family="${FONT}" font-size="10" font-weight="600" fill="${t.muted}" letter-spacing="1.6">CONTRIBUTIONS · LAST 12 MONTHS</text>
  <text x="${W}" y="14" text-anchor="end" font-family="${FONT}" font-size="12" font-weight="400" fill="${t.muted}">${total} total · ${active} active days</text>`;
  const foot = `  <text x="0" y="${H - 4}" font-family="${FONT}" font-size="11" font-weight="400" fill="${t.muted}">${calendar[0]?.[0] ?? ''} → ${calendar.at(-1)?.[0] ?? ''}</text>`;
  return svg(W, H, `${head}\n  ${cells}\n${foot}`);
}

// ---------- animated typing banner (self-hosted; SMIL runs inside <img>) ----------
export function typingCard(lines, scheme = 'dark', theme = 'openbuild') {
  const t = THEME[scheme];
  const P = pal(theme, scheme);
  const W = 720;
  const H = 48;
  const fs = 22;
  const charW = fs * 0.52;
  const dur = 12;
  const n = lines.length;
  const slot = 1 / n;
  const y = 32;

  const rows = lines
    .map((line, i) => {
      const w = Math.min(W, line.length * charW + 8);
      const t0 = i * slot;
      const typeEnd = t0 + slot * 0.45;
      const holdEnd = t0 + slot * 0.85;
      const eraseEnd = t0 + slot * 0.95;
      const kt = [0, t0, typeEnd, holdEnd, eraseEnd, 1].map((x) => +x.toFixed(4)).join(';');
      const vals = ['0', '0', String(w), String(w), '0', '0'].join(';');
      return `  <clipPath id="type${i}"><rect x="0" y="${y - fs}" width="0" height="${fs + 8}">
    <animate attributeName="width" values="${vals}" keyTimes="${kt}" dur="${dur}s" repeatCount="indefinite"/>
  </rect></clipPath>
  <g clip-path="url(#type${i})">
    <text x="0" y="${y}" font-family="${FONT}" font-size="${fs}" font-weight="300" fill="${t.text}" letter-spacing="-0.4">${esc(line)}</text>
  </g>
  <rect x="0" y="${y - fs + 3}" width="2" height="${fs}" fill="${P.accent}">
    <animate attributeName="x" values="0;0;${w};${w};0;0" keyTimes="${kt}" dur="${dur}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="1;0;1;0;1;0;1;0;1;0;1;0" dur="1s" repeatCount="indefinite"/>
  </rect>`;
    })
    .join('\n');

  return svg(W, H, rows);
}

// ---------- trophy wall (replaces github-profile-trophy, which returns 402) ----------
const TIER_ORDER = ['A', 'AA', 'AAA', 'S', 'SS', 'SSS'];

function tier(value, thresholds) {
  let out = null;
  for (const key of TIER_ORDER) if (value >= thresholds[key]) out = key;
  return out;
}

export function trophyCard(stats, contributions, scheme = 'dark', theme = 'openbuild') {
  const t = THEME[scheme];
  const P = pal(theme, scheme);
  const items = [
    ['COMMITS', contributions.commits, { A: 50, AA: 100, AAA: 250, S: 500, SS: 1000, SSS: 2500 }],
    ['STARS', stats.totalStars, { A: 5, AA: 10, AAA: 25, S: 50, SS: 100, SSS: 250 }],
    ['REPOS', stats.ownRepos, { A: 5, AA: 10, AAA: 20, S: 35, SS: 50, SSS: 100 }],
    ['FOLLOWERS', stats.followers ?? 0, { A: 5, AA: 10, AAA: 25, S: 50, SS: 100, SSS: 250 }],
    ['PRS', contributions.pullRequests, { A: 5, AA: 10, AAA: 25, S: 50, SS: 100, SSS: 250 }],
    ['ACTIVE DAYS', contributions.activeDays, { A: 30, AA: 60, AAA: 120, S: 180, SS: 240, SSS: 300 }],
  ]
    .map(([label, value, thresholds]) => ({ label, value, tier: tier(value, thresholds) }))
    .filter((i) => i.tier);

  if (items.length === 0) return '';

  const W = 720;
  const H = 92;
  const colW = W / items.length;
  const body = items
    .map((it, i) => {
      const cx = i * colW + colW / 2;
      return `  <text x="${cx.toFixed(1)}" y="40" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="200" fill="${P.accent}" letter-spacing="-0.5">${it.tier}</text>
  <text x="${cx.toFixed(1)}" y="62" text-anchor="middle" font-family="${FONT}" font-size="9" font-weight="600" fill="${t.muted}" letter-spacing="1.4">${it.label}</text>
  <text x="${cx.toFixed(1)}" y="80" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="400" fill="${t.muted}">${it.value}</text>`;
    })
    .join('\n');
  return svg(W, H, body);
}
