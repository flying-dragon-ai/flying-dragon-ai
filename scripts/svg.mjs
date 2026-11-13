// Self-rendered SVG cards. No third-party renderer, no rate limit, no 402.
// Every number here comes from data/profile.json, which came from `gh`.

// Accent palettes. One data source, several visual identities.
export const PALETTES = {
  teal: { accent: '#2f8f83', accentSoft: '#3fb3a4', ramp: ['#1d5c55', '#2f8f83', '#4fb8a8', '#8fe0d2'] },
  sakura: { accent: '#c2557f', accentSoft: '#e07aa2', ramp: ['#6b2a44', '#a8446a', '#d4708f', '#f2b8cc'] },
  amber: { accent: '#b5761f', accentSoft: '#d99a3c', ramp: ['#5c3a0e', '#8f5c17', '#c08a2e', '#e8c37a'] },
};

export const THEME = {
  accent: PALETTES.teal.accent,
  accentSoft: PALETTES.teal.accentSoft,
  dark: { bg: '#0d1117', panel: '#161b22', border: '#30363d', text: '#e6edf3', muted: '#8b949e', empty: '#21262d' },
  light: { bg: '#ffffff', panel: '#f6f8fa', border: '#d0d7de', text: '#1f2328', muted: '#656d76', empty: '#ebedf0' },
};

const pal = (theme) => PALETTES[theme] ?? PALETTES.teal;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function frame(t, w, h, body, { radius = 12 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${radius}" fill="${t.bg}" stroke="${t.border}"/>
${body}
</svg>
`;
}

// ---------- language bar ----------
export function langBar(languages, scheme = 'dark', theme = 'teal') {
  const t = THEME[scheme];
  const P = pal(theme);
  const top = languages.slice(0, 8);
  const rest = languages.slice(8);
  const restPct = rest.reduce((a, l) => a + l.pct, 0);
  const rows = restPct > 0.05 ? [...top, { name: 'Other', pct: +restPct.toFixed(2) }] : top;

  const W = 720;
  const barY = 46;
  const barH = 14;
  const barW = W - 48;
  const palette =
    scheme === 'dark'
      ? [P.accent, P.accentSoft, ...P.ramp.slice(2), '#a3e2d8', '#c4ece5', '#dff5f1', '#8b949e', '#484f58']
      : [P.ramp[0], P.accent, P.accentSoft, ...P.ramp.slice(2), '#93ded4', '#b3eae3', '#6e7681', '#484f58'];

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
export function heatmap(calendar, scheme = 'dark', theme = 'teal') {
  const t = THEME[scheme];
  const P = pal(theme);
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
export function statCard(stats, contributions, scheme = 'dark', theme = 'teal') {
  const t = THEME[scheme];
  const P = pal(theme);
  const items = [
    ['REPOS', stats.ownRepos],
    ['STARS', stats.totalStars],
    ['COMMITS', contributions.commits],
    ['PRS', contributions.pullRequests],
    ['ACTIVE DAYS', contributions.activeDays],
  ];
  const W = 720;
  const H = 108;
  const colW = (W - 48) / items.length;
  const body = items.map(([label, value], i) => {
    const cx = 24 + i * colW + colW / 2;
    return `<text x="${cx}" y="52" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="30" font-weight="700" fill="${P.accentSoft}">${value}</text>
  <text x="${cx}" y="76" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11" fill="${t.muted}" letter-spacing="1.4">${label}</text>`;
  }).join('\n  ');
  return frame(t, W, H, `  ${body}`);
}

// ---------- streak card (replaces the flaky heroku streak service) ----------
export function streakCard(calendar, scheme = 'dark', theme = 'teal') {
  const t = THEME[scheme];
  const P = pal(theme);
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
export function typingCard(lines, scheme = 'dark', theme = 'teal') {
  const t = THEME[scheme];
  const P = pal(theme);
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
