// Self-rendered SVG cards. No third-party renderer, no rate limit, no 402.
// Every number here comes from data/profile.json, which came from `gh`.

// Accent palettes.
// `openbuild` values are measured from https://openbuild.xyz/ on 2026-11-13:
//   page bg #F8F8F8 · card #FFFFFF · ink #1A1A1A · near-black #0A0A0A
//   mint #01DB83 · lavender #CB9BFA · butter #F8FD91 · card radius 16px
// Mint is a FILL in light mode (black text sits on it), a TEXT colour in dark mode.
export const PALETTES = {
  openbuild: {
    dark: {
      accent: '#01DB83',
      accentSoft: '#4DFFB0',
      onAccent: '#0A0A0A',
      cardBg: '#1A1A1A',
      cardText: '#01DB83',
      ramp: ['#0B5C3A', '#0E8F58', '#01DB83', '#7CF0BE'],
      categorical: ['#01DB83', '#CB9BFA', '#F8FD91', '#F5F5F5', '#7CE8B8', '#E0C4FC', '#FBFEC4', '#8A8A8A', '#4A4A4A'],
    },
    light: {
      accent: '#1A1A1A',
      accentSoft: '#1A1A1A',
      onAccent: '#FFFFFF',
      cardBg: '#01DB83',
      cardText: '#1A1A1A',
      ramp: ['#A8F0CE', '#4FE0A4', '#01DB83', '#00854D'],
      categorical: ['#01DB83', '#CB9BFA', '#F8FD91', '#1A1A1A', '#7CE8B8', '#E0C4FC', '#FBFEC4', '#8A8A8A', '#4A4A4A'],
    },
  },
  lavender: {
    dark: {
      accent: '#CB9BFA',
      accentSoft: '#E0C4FC',
      onAccent: '#0A0A0A',
      cardBg: '#1A1A1A',
      cardText: '#CB9BFA',
      ramp: ['#3D2456', '#6B3F94', '#CB9BFA', '#E0C4FC'],
      categorical: ['#CB9BFA', '#01DB83', '#F8FD91', '#F5F5F5', '#E0C4FC', '#7CE8B8', '#FBFEC4', '#8A8A8A', '#4A4A4A'],
    },
    light: {
      accent: '#1A1A1A',
      accentSoft: '#1A1A1A',
      onAccent: '#FFFFFF',
      cardBg: '#CB9BFA',
      cardText: '#1A1A1A',
      ramp: ['#D9B8FB', '#C48AF7', '#CB9BFA', '#7B3FB0'],
      categorical: ['#CB9BFA', '#01DB83', '#F8FD91', '#1A1A1A', '#E0C4FC', '#7CE8B8', '#FBFEC4', '#8A8A8A', '#4A4A4A'],
    },
  },
};

export const THEME = {
  dark: { bg: '#0A0A0A', panel: '#1A1A1A', border: '#2A2A2A', text: '#F5F5F5', muted: '#8A8A8A', empty: '#1F1F1F' },
  light: { bg: '#FFFFFF', panel: '#F8F8F8', border: '#E5E5E5', text: '#1A1A1A', muted: '#6B6B6B', empty: '#EDEDED' },
};

const pal = (theme, scheme) => (PALETTES[theme] ?? PALETTES.openbuild)[scheme] ?? PALETTES.openbuild.dark;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function frame(t, w, h, body, { radius = 12 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${radius}" fill="${t.bg}" stroke="${t.border}"/>
${body}
</svg>
`;
}

// ---------- language bar ----------
export function langBar(languages, scheme = 'dark', theme = 'openbuild') {
  const t = THEME[scheme];
  const P = pal(theme, scheme);
  const top = languages.slice(0, 8);
  const rest = languages.slice(8);
  const restPct = rest.reduce((a, l) => a + l.pct, 0);
  const rows = restPct > 0.05 ? [...top, { name: 'Other', pct: +restPct.toFixed(2) }] : top;

  const W = 720;
  const barY = 46;
  const barH = 14;
  const barW = W - 48;
  const palette = P.categorical;

  let x = 24;
  const segs = rows.map((l, i) => {
    const w = Math.max(2, (l.pct / 100) * barW);
    const drawW = Math.max(1, w - 2);
    const seg = `<rect x="${x.toFixed(2)}" y="${barY}" width="${drawW.toFixed(2)}" height="${barH}" fill="${palette[i % palette.length]}"/>`;
    x += w;
    return seg;
  }).join('\n  ');

  // legend: two columns
  const colW = (W - 48) / 2;
  const legend = rows.map((l, i) => {
    const cx = 24 + (i % 2) * colW;
    const cy = barY + barH + 26 + Math.floor(i / 2) * 22;
    return `<circle cx="${cx + 5}" cy="${cy - 4}" r="5" fill="${palette[i % palette.length]}"/>
  <text x="${cx + 18}" y="${cy}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12" fill="${t.text}">${esc(l.name)}</text>
  <text x="${cx + colW - 24}" y="${cy}" text-anchor="end" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12" fill="${t.muted}">${l.pct.toFixed(1)}%</text>`;
  }).join('\n  ');

  const H = barY + barH + 26 + Math.ceil(rows.length / 2) * 22 + 8;
  const body = `  <text x="24" y="28" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="13" font-weight="600" fill="${t.muted}" letter-spacing="1.2">LANGUAGE MIX · BY BYTES</text>
  <g clip-path="url(#barclip)">${segs}</g>
  <defs><clipPath id="barclip"><rect x="24" y="${barY}" width="${barW}" height="${barH}" rx="7"/></clipPath></defs>
  ${legend}`;
  return frame(t, W, H, body);
}

// ---------- contribution heatmap ----------
export function heatmap(calendar, scheme = 'dark', theme = 'openbuild') {
  const t = THEME[scheme];
  const P = pal(theme, scheme);
  const weeks = [];
  for (let i = 0; i < calendar.length; i += 7) weeks.push(calendar.slice(i, i + 7));
  const cell = 11;
  const gap = 3;
  const left = 24;
  const top = 44;
  const W = left * 2 + weeks.length * (cell + gap);
  const H = top + 7 * (cell + gap) + 26;

  const levels = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);
  const fills = [t.empty, ...P.ramp];

  let cells = '';
  weeks.forEach((week, wi) => {
    week.forEach(([date, count], di) => {
      const x = left + wi * (cell + gap);
      const y = top + di * (cell + gap);
      cells += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${fills[levels(count)]}"><title>${date}: ${count}</title></rect>`;
    });
  });

  const total = calendar.reduce((a, [, c]) => a + c, 0);
  const active = calendar.filter(([, c]) => c > 0).length;
  const body = `  <text x="${left}" y="26" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="13" font-weight="600" fill="${t.muted}" letter-spacing="1.2">CONTRIBUTIONS · LAST 12 MONTHS</text>
  <text x="${W - left}" y="26" text-anchor="end" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12" fill="${t.text}">${total} total · ${active} active days</text>
  ${cells}
  <text x="${left}" y="${H - 8}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11" fill="${t.muted}">${calendar[0]?.[0] ?? ''} → ${calendar.at(-1)?.[0] ?? ''}</text>
  <g transform="translate(${W - left - 96},${H - 16})">
    <text x="-8" y="9" text-anchor="end" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11" fill="${t.muted}">less</text>
    ${fills.map((f, i) => `<rect x="${i * (cell + gap)}" y="0" width="${cell}" height="${cell}" rx="2" fill="${f}"/>`).join('')}
    <text x="${5 * (cell + gap) + 4}" y="9" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11" fill="${t.muted}">more</text>
  </g>`;
  return frame(t, W, H, body);
}

// ---------- stat card ----------
export function statCard(stats, contributions, scheme = 'dark', theme = 'openbuild') {
  const t = THEME[scheme];
  const P = pal(theme, scheme);
  const items = [
    ['REPOS', stats.ownRepos],
    ['STARS', stats.totalStars],
    ['COMMITS', contributions.commits],
    ['PRS', contributions.pullRequests],
    ['ACTIVE DAYS', contributions.activeDays],
  ];
  const cardBg = P.cardBg ?? t.panel;
  const cardText = P.cardText ?? P.accentSoft;
  const W = 720;
  const H = 108;
  const colW = (W - 48) / items.length;
  const body = items
    .map(([label, value], i) => {
      const cx = 24 + i * colW + colW / 2;
      return `<text x="${cx}" y="52" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="30" font-weight="700" fill="${cardText}">${value}</text>
  <text x="${cx}" y="76" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11" fill="${cardText}" opacity="0.72" letter-spacing="1.4">${label}</text>`;
    })
    .join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${cardBg}" stroke="${cardBg}"/>
  ${body}
</svg>
`;
}

// ---------- streak card (replaces the flaky heroku streak service) ----------
export function streakCard(calendar, scheme = 'dark', theme = 'openbuild') {
  const t = THEME[scheme];
  const P = pal(theme, scheme);
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
  const items = [
    ['CURRENT STREAK', `${current}d`],
    ['LONGEST STREAK', `${longest}d`],
    ['TOTAL', total],
  ];
  const W = 720;
  const H = 96;
  const colW = (W - 48) / items.length;
  const body = items
    .map(([label, value], i) => {
      const cx = 24 + i * colW + colW / 2;
      return `<text x="${cx}" y="48" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="28" font-weight="700" fill="${P.accentSoft}">${value}</text>
  <text x="${cx}" y="70" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11" fill="${t.muted}" letter-spacing="1.4">${label}</text>`;
    })
    .join('\n  ');
  return frame(t, W, H, `  ${body}`);
}

// ---------- animated typing banner (self-hosted; SMIL runs inside <img>) ----------
export function typingCard(lines, scheme = 'dark', theme = 'openbuild') {
  const t = THEME[scheme];
  const P = pal(theme, scheme);
  const W = 720;
  const H = 56;
  const fs = 20;
  const charW = fs * 0.6;
  const left = 24;
  const dur = 12;
  const n = lines.length;
  const slot = 1 / n;
  const y = 36;

  const rows = lines.map((line, i) => {
    const w = Math.min(W - left * 2, line.length * charW + 8);
    const t0 = i * slot;
    const typeEnd = t0 + slot * 0.45;
    const holdEnd = t0 + slot * 0.85;
    const eraseEnd = t0 + slot * 0.95;
    const kt = [0, t0, typeEnd, holdEnd, eraseEnd, 1].map((x) => +x.toFixed(4)).join(';');
    const vals = ['0', '0', String(w), String(w), '0', '0'].join(';');
    return `  <clipPath id="type${i}"><rect x="${left}" y="${y - fs}" width="0" height="${fs + 8}">
    <animate attributeName="width" values="${vals}" keyTimes="${kt}" dur="${dur}s" repeatCount="indefinite"/>
  </rect></clipPath>
  <g clip-path="url(#type${i})">
    <text x="${left}" y="${y}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="${fs}" font-weight="600" fill="${P.accentSoft}">${esc(line)}</text>
  </g>
  <rect x="${left}" y="${y - fs + 2}" width="2" height="${fs}" fill="${P.accent}">
    <animate attributeName="x" values="${left};${left};${left + w};${left + w};${left};${left}" keyTimes="${kt}" dur="${dur}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="1;0;1;0;1;0;1;0;1;0;1;0" dur="1s" repeatCount="indefinite"/>
  </rect>`;
  }).join('\n');

  return frame(t, W, H, rows, { radius: 10 });
}

// ---------- trophy wall (replaces github-profile-trophy, which returns 402) ----------
// Absolute thresholds, calibrated for a working account rather than a celebrity one.
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
  const H = 104;
  const gap = 10;
  const cardW = (W - 48 - gap * (items.length - 1)) / items.length;
  const body = items
    .map((it, i) => {
      const x = 24 + i * (cardW + gap);
      return `<rect x="${x.toFixed(1)}" y="22" width="${cardW.toFixed(1)}" height="60" rx="8" fill="${t.panel}" stroke="${t.border}"/>
  <text x="${(x + cardW / 2).toFixed(1)}" y="52" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="20" font-weight="700" fill="${P.accentSoft}">${it.tier}</text>
  <text x="${(x + cardW / 2).toFixed(1)}" y="70" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="9" fill="${t.muted}" letter-spacing="1">${it.label}</text>
  <text x="${(x + cardW / 2).toFixed(1)}" y="96" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11" fill="${t.text}">${it.value}</text>`;
    })
    .join('\n  ');
  return frame(t, W, H, `  ${body}`);
}
