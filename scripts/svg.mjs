// Self-rendered SVG cards. No third-party renderer, no rate limit, no 402.
// Every number here comes from data/profile.json, which came from `gh`.
//
// Visual language: Apple iOS system palette.
//   System Blue #007AFF · System Purple #AF52DE · Gray 6 #F2F2F7 · White #FFFFFF
//   Black #000000 · Gray #8E8E93 · Gray 1 #1C1C1E
// Dark-mode variants are Apple's own: Blue #0A84FF, Purple #BF5AF2.
// Cards use large radii, soft shadows and Gray 6 / Gray 1 fills.

export const PALETTES = {
  openbuild: {
    light: {
      accent: '#007AFF',
      accent2: '#AF52DE',
      onAccent: '#FFFFFF',
      cardBg: '#F2F2F7',
      cardText: '#000000',
      ramp: ['#D6E9FF', '#9CC9FF', '#4D9FFF', '#007AFF'],
      categorical: ['#007AFF', '#AF52DE', '#5AC8FA', '#8E8E93', '#C7C7CC', '#AEAEB2', '#D1D1D6', '#E5E5EA', '#F2F2F7'],
    },
    dark: {
      accent: '#0A84FF',
      accent2: '#BF5AF2',
      onAccent: '#FFFFFF',
      cardBg: '#1C1C1E',
      cardText: '#FFFFFF',
      ramp: ['#0A2540', '#0A4A8A', '#0A84FF', '#5AC8FA'],
      categorical: ['#0A84FF', '#BF5AF2', '#64D2FF', '#8E8E93', '#48484A', '#636366', '#3A3A3C', '#2C2C2E', '#1C1C1E'],
    },
  },
  lavender: {
    light: {
      accent: '#AF52DE',
      accent2: '#007AFF',
      onAccent: '#FFFFFF',
      cardBg: '#F2F2F7',
      cardText: '#000000',
      ramp: ['#F0DFFC', '#DDB4F7', '#C77BEE', '#AF52DE'],
      categorical: ['#AF52DE', '#007AFF', '#5AC8FA', '#8E8E93', '#C7C7CC', '#AEAEB2', '#D1D1D6', '#E5E5EA', '#F2F2F7'],
    },
    dark: {
      accent: '#BF5AF2',
      accent2: '#0A84FF',
      onAccent: '#FFFFFF',
      cardBg: '#1C1C1E',
      cardText: '#FFFFFF',
      ramp: ['#2E1240', '#5A1F7A', '#BF5AF2', '#E0A8FF'],
      categorical: ['#BF5AF2', '#0A84FF', '#64D2FF', '#8E8E93', '#48484A', '#636366', '#3A3A3C', '#2C2C2E', '#1C1C1E'],
    },
  },
};

export const THEME = {
  light: { bg: '#FFFFFF', panel: '#F2F2F7', border: '#E5E5EA', text: '#000000', muted: '#8E8E93', empty: '#E5E5EA' },
  dark: { bg: '#000000', panel: '#1C1C1E', border: '#38383A', text: '#FFFFFF', muted: '#8E8E93', empty: '#2C2C2E' },
};

// Single quotes: this string is interpolated into a double-quoted SVG attribute.
export const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif";
export const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

const pal = (theme, scheme) => (PALETTES[theme] ?? PALETTES.openbuild)[scheme] ?? PALETTES.openbuild.dark;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">\n${body}\n</svg>\n`;

// iOS card: large radius, soft shadow, Gray 6 / Gray 1 fill.
function cardFrame(w, h, scheme, theme, body, { radius = 20 } = {}) {
  const P = pal(theme, scheme);
  const shadow =
    scheme === 'dark'
      ? '<feDropShadow dx="0" dy="1" stdDeviation="4" flood-color="#000" flood-opacity="0.55"/>'
      : '<feDropShadow dx="0" dy="2" stdDeviation="8" flood-color="#000" flood-opacity="0.06"/>';
  return svg(
    w,
    h,
    `  <defs><filter id="card" x="-8%" y="-12%" width="116%" height="132%">${shadow}</filter></defs>
  <rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" fill="${P.cardBg}" filter="url(#card)"/>
${body}`,
  );
}

// ---------- metric row ----------
function metricRow(items, scheme, theme, { numberSize = 40, height = 132 } = {}) {
  const t = THEME[scheme];
  const P = pal(theme, scheme);
  const W = 720;
  const colW = W / items.length;
  const body = items
    .map(([label, value], i) => {
      const cx = i * colW + colW / 2;
      return `  <rect x="${(cx - 12).toFixed(1)}" y="30" width="24" height="3" rx="1.5" fill="${P.accent}"/>
  <text x="${cx.toFixed(1)}" y="${30 + numberSize + 16}" text-anchor="middle" font-family="${FONT}" font-size="${numberSize}" font-weight="300" fill="${P.cardText}" letter-spacing="-1.5">${value}</text>
  <text x="${cx.toFixed(1)}" y="${30 + numberSize + 40}" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="600" fill="${t.muted}" letter-spacing="1.6">${label}</text>`;
    })
    .join('\n');
  return cardFrame(W, height, scheme, theme, body);
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
    { numberSize: 34, height: 120 },
  );
}

// ---------- language bar ----------
export function langBar(languages, scheme = 'dark', theme = 'openbuild') {
  const t = THEME[scheme];
  const P = pal(theme, scheme);
  const top = languages.slice(0, 6);
  const restPct = languages.slice(6).reduce((a, l) => a + l.pct, 0);
  const rows = restPct > 0.05 ? [...top, { name: 'Other', pct: +restPct.toFixed(2) }] : top;

  const W = 720;
  const pad = 28;
  const barY = 34;
  const barH = 8;
  const barW = W - pad * 2;

  let x = pad;
  const segs = rows
    .map((l, i) => {
      const w = Math.max(2, (l.pct / 100) * barW);
      const seg = `<rect x="${x.toFixed(2)}" y="${barY}" width="${Math.max(1, w - 3).toFixed(2)}" height="${barH}" rx="4" fill="${P.categorical[i % P.categorical.length]}"/>`;
      x += w;
      return seg;
    })
    .join('\n  ');

  const legend = rows
    .slice(0, 4)
    .map((l, i) => {
      const lx = pad + i * 150;
      return `<circle cx="${lx + 4}" cy="${barY + barH + 26}" r="4" fill="${P.categorical[i % P.categorical.length]}"/>
  <text x="${lx + 16}" y="${barY + barH + 30}" font-family="${FONT}" font-size="13" font-weight="500" fill="${P.cardText}">${esc(l.name)}</text>
  <text x="${lx + 16 + l.name.length * 7.6 + 16}" y="${barY + barH + 30}" font-family="${FONT}" font-size="13" font-weight="400" fill="${t.muted}">${l.pct.toFixed(1)}%</text>`;
    })
    .join('\n  ');

  const more =
    languages.length > 4
      ? `<text x="${W - pad}" y="${barY + barH + 30}" text-anchor="end" font-family="${FONT}" font-size="13" font-weight="400" fill="${t.muted}">+${languages.length - 4} more</text>`
      : '';
  return cardFrame(W, barY + barH + 52, scheme, theme, `  ${segs}\n  ${legend}\n  ${more}`);
}

// ---------- contribution heatmap ----------
export function heatmap(calendar, scheme = 'dark', theme = 'openbuild') {
  const t = THEME[scheme];
  const P = pal(theme, scheme);
  const weeks = [];
  for (let i = 0; i < calendar.length; i += 7) weeks.push(calendar.slice(i, i + 7));
  const cell = 11;
  const gap = 3;
  const pad = 28;
  const top = 52;
  const W = weeks.length * (cell + gap) + pad * 2 - gap;
  const H = top + 7 * (cell + gap) + 34;

  const levels = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);
  const fills = [t.empty, ...P.ramp];

  let cells = '';
  weeks.forEach((week, wi) => {
    week.forEach(([date, count], di) => {
      const x = pad + wi * (cell + gap);
      const y = top + di * (cell + gap);
      cells += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2.5" fill="${fills[levels(count)]}"><title>${date}: ${count}</title></rect>`;
    });
  });

  const total = calendar.reduce((a, [, c]) => a + c, 0);
  const active = calendar.filter(([, c]) => c > 0).length;
  const head = `  <text x="${pad}" y="30" font-family="${FONT}" font-size="10" font-weight="600" fill="${t.muted}" letter-spacing="1.6">CONTRIBUTIONS · LAST 12 MONTHS</text>
  <text x="${W - pad}" y="30" text-anchor="end" font-family="${FONT}" font-size="13" font-weight="400" fill="${t.muted}">${total} total · ${active} active days</text>`;
  const foot = `  <text x="${pad}" y="${H - 14}" font-family="${FONT}" font-size="11" font-weight="400" fill="${t.muted}">${calendar[0]?.[0] ?? ''} → ${calendar.at(-1)?.[0] ?? ''}</text>`;
  return cardFrame(W, H, scheme, theme, `${head}\n  ${cells}\n${foot}`);
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
  const H = 108;
  const colW = W / items.length;
  const body = items
    .map((it, i) => {
      const cx = i * colW + colW / 2;
      return `  <text x="${cx.toFixed(1)}" y="46" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="300" fill="${P.accent}" letter-spacing="-0.5">${it.tier}</text>
  <text x="${cx.toFixed(1)}" y="68" text-anchor="middle" font-family="${FONT}" font-size="9" font-weight="600" fill="${t.muted}" letter-spacing="1.4">${it.label}</text>
  <text x="${cx.toFixed(1)}" y="88" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="400" fill="${t.muted}">${it.value}</text>`;
    })
    .join('\n');
  return cardFrame(W, H, scheme, theme, body);
}
