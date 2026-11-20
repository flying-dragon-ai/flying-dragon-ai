#!/usr/bin/env python3
"""Generate the flying-dragon-ai GitHub profile.

One entry point, one data source. Every number that appears in a README or is drawn
inside an SVG comes from the same `gh` fetch, so the prose and the artwork cannot drift.

    python scripts/generate.py              # live data via gh -> 5 READMEs + 15 SVGs
    python scripts/generate.py --offline    # reuse data/profile.json, no network
    python scripts/generate.py --demo       # deterministic fake data, offline preview
    python scripts/generate.py --lang zh-CN # render one language only

Layout, animation and the ASCII wordmark alphabet are derived from Aqua-Launch
(pretty-github, MIT, (c) 2026 Arta Bidkhori). See LICENSE.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path
from xml.etree import ElementTree
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
DATA = ROOT / "data"
I18N = Path(__file__).resolve().parent / "i18n"

LANGS = ["en", "zh-CN", "ja", "ko", "ru"]
DEFAULT_LANG = "en"

# ---------------------------------------------------------------- palette
OUTER = "#0b1d20"
BG = "#071416"
PANEL = "#0a2928"
PANEL_2 = "#0b2227"
HAIR = "#168f82"
TEAL = "#43ead3"
MINT = "#83ffe8"
BLUE = "#4387ff"
PURPLE = "#9b6cff"
YELLOW = "#f2dc56"
ORANGE = "#ff6b48"
GREEN = "#56f73a"
TEXT = "#dcfff7"
MUTED = "#79aaa4"

# CJK-safe stack: GitHub renders the SVG inside an <img>, so the viewer's fonts apply.
FONT = "'Trebuchet MS','Segoe UI','Microsoft YaHei','PingFang SC','Hiragino Sans','Malgun Gothic',sans-serif"
MONO = "ui-monospace,Consolas,'Cascadia Mono',monospace"

GLYPHS = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "G": ["01111", "10000", "10000", "10111", "10001", "10001", "01110"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "J": ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    "W": ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    "0": ["01110", "10011", "10101", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
    "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
    " ": ["000", "000", "000", "000", "000", "000", "000"],
}


# ---------------------------------------------------------------- data
def load_config() -> dict:
    return json.loads((ROOT / "config.json").read_text(encoding="utf-8"))


def gh(args: list[str]) -> object:
    """Every byte of profile data enters through the GitHub CLI."""
    exe = os.environ.get("GH_BIN", "gh")
    proc = subprocess.run(
        [exe, *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        env={**os.environ, "GH_PAGER": "cat", "NO_COLOR": "1"},
    )
    if proc.returncode != 0:
        raise RuntimeError(f"gh {' '.join(args)} failed: {proc.stderr.strip()[:400]}")
    return json.loads(proc.stdout) if proc.stdout.strip() else None


def fetch_profile(username: str) -> dict:
    user = gh(["api", f"users/{username}"])
    repos = gh(["api", f"users/{username}/repos?per_page=100&sort=pushed", "--paginate", "--slurp"])
    if isinstance(repos, list) and repos and isinstance(repos[0], list):
        repos = [repo for page in repos for repo in page]
    if not isinstance(user, dict) or not isinstance(repos, list):
        raise RuntimeError("unexpected response from the GitHub REST API")

    own = [r for r in repos if not r.get("fork")]
    languages: dict[str, int] = {}
    for repo in own:
        name = repo.get("language")
        if name:
            languages[name] = languages.get(name, 0) + 1

    return {
        "user": {
            "login": user["login"],
            "name": user.get("name") or user["login"],
            "avatarUrl": user["avatar_url"],
            "htmlUrl": user["html_url"],
            "followers": int(user.get("followers", 0)),
            "createdAt": user["created_at"],
        },
        "stats": {
            "ownRepos": len(own),
            "forks": len(repos) - len(own),
            "totalStars": sum(int(r.get("stargazers_count", 0)) for r in own),
            "languages": sorted(languages.items(), key=lambda kv: (-kv[1], kv[0])),
        },
        "repos": [
            {
                "name": r["name"],
                "description": r.get("description") or "",
                "url": r["html_url"],
                "language": r.get("language"),
                "stars": int(r.get("stargazers_count", 0)),
                "pushedAt": r.get("pushed_at"),
            }
            for r in own
        ],
    }


def fetch_contributions(username: str) -> dict:
    query = (
        'query($login:String!){user(login:$login){contributionsCollection{'
        "contributionCalendar{totalContributions weeks{contributionDays{"
        "date contributionCount contributionLevel}}}}}}"
    )
    result = gh(["api", "graphql", "-f", f"query={query}", "-F", f"login={username}"])
    levels = {"NONE": 0, "FIRST_QUARTILE": 1, "SECOND_QUARTILE": 2, "THIRD_QUARTILE": 3, "FOURTH_QUARTILE": 4}
    calendar = result["data"]["user"]["contributionsCollection"]["contributionCalendar"]
    days = [
        {
            "date": d["date"],
            "count": int(d["contributionCount"]),
            "level": levels.get(d["contributionLevel"], 0),
        }
        for week in calendar["weeks"]
        for d in week["contributionDays"]
    ]
    return summarize_contributions(int(calendar["totalContributions"]), days)


def fetch_upstream(username: str, limit: int = 30) -> list[dict]:
    """Merged pull requests authored by the account — the only third-party signal here."""
    query = f"author:{username}+type:pr+is:merged"
    try:
        result = gh(["api", f"search/issues?q={query}&per_page={limit}"])
    except RuntimeError:
        return []
    items = (result or {}).get("items") or []
    return [
        {
            "repo": item["repository_url"].split("/repos/")[-1],
            "number": item["number"],
            "title": item["title"],
            "url": item["html_url"],
        }
        for item in items
    ]


def summarize_contributions(total: int, days: list[dict]) -> dict:
    active = [d for d in days if d["count"] > 0]
    peak = max(days, key=lambda d: d["count"]) if days else {"count": 0, "date": ""}
    return {
        "total": total,
        "days": days,
        "activeDays": len(active),
        "peakCount": peak["count"],
        "peakDay": peak["date"],
        "windowDays": len(days),
        "last90": sum(d["count"] for d in days[-90:]),
    }


def demo_data() -> tuple[dict, dict]:
    rng = random.Random(430)
    end = date.today()
    start = end - timedelta(days=370)
    days = []
    for offset in range(371):
        iso = (start + timedelta(days=offset)).isoformat()
        active = rng.random() > (0.80 if offset < 190 else 0.72)
        level = rng.choices([1, 2, 3, 4], weights=[44, 30, 18, 8])[0] if active else 0
        days.append({"date": iso, "count": rng.randint(level, level * 4) if level else 0, "level": level})
    profile = {
        "user": {
            "login": "flying-dragon-ai",
            "name": "flying~dragon",
            "avatarUrl": "https://avatars.githubusercontent.com/u/58673960?v=4",
            "htmlUrl": "https://github.com/flying-dragon-ai",
            "followers": 6,
            "createdAt": "2019-12-09T02:08:04Z",
        },
        "stats": {
            "ownRepos": 17,
            "forks": 54,
            "totalStars": 6,
            "languages": [["Python", 6], ["TypeScript", 5], ["JavaScript", 4], ["PowerShell", 2], ["HTML", 1]],
        },
        "repos": [],
    }
    return profile, summarize_contributions(379, days)


# ---------------------------------------------------------------- primitives
def trim(value: object, size: int) -> str:
    text = " ".join(str(value or "").split())
    return text if len(text) <= size else text[: size - 1].rstrip() + "…"


def ascii_lines(word: str, alphabet: str, scale_x: int = 2, scale_y: int = 2) -> list[str]:
    clean = "".join(ch for ch in word.upper() if ch in GLYPHS)[:8] or "HELLO"
    rows = []
    for row in range(7):
        chunks = []
        for index, char in enumerate(clean):
            glyph = GLYPHS[char][row]
            chunk = "".join(
                (alphabet[(cell + row + index) % len(alphabet)] * scale_x) if bit == "1" else (" " * scale_x)
                for cell, bit in enumerate(glyph)
            )
            chunks.append(chunk)
        rows.extend(["   ".join(chunks)] * scale_y)
    return rows


def portrait_lines(path: Path, cols: int = 62, max_rows: int = 46) -> list[str]:
    from PIL import Image, ImageEnhance, ImageOps

    with Image.open(path) as source:
        image = ImageOps.autocontrast(ImageEnhance.Contrast(ImageOps.grayscale(source)).enhance(1.25))
        rows = min(max_rows, max(1, round(image.height / image.width * cols * 0.78)))
        small = image.resize((cols, rows), Image.Resampling.LANCZOS)
        pixels = list(small.getdata())
    low, high = min(pixels), max(pixels)
    ramp = " .`:-=+*cs#%@"
    lines = []
    for row in range(rows):
        chars = []
        for value in pixels[row * cols : (row + 1) * cols]:
            normalized = (value - low) / max(1, high - low)
            chars.append(ramp[min(len(ramp) - 1, int((1.0 - normalized) * len(ramp)))])
        lines.append("".join(chars))
    return lines


def shared_style() -> str:
    return (
        f".display{{font:700 28px {FONT};fill:{TEXT}}}"
        f".title{{font:700 24px {FONT};fill:{TEXT}}}"
        f".label{{font:700 9px {FONT};fill:{TEAL};letter-spacing:1.6px}}"
        f".body{{font:12px {FONT};fill:{MUTED}}}"
        f".mono{{font:10px {MONO};fill:{MUTED}}}"
        "@media(prefers-reduced-motion:reduce){*{animation:none!important}}"
    )


def shell(width: int, height: int, inner: str) -> str:
    return (
        f'<rect width="{width}" height="{height}" rx="24" fill="{OUTER}"/>'
        f'<rect x="6" y="6" width="{width - 12}" height="{height - 12}" rx="20" fill="url(#shell)" stroke="{HAIR}"/>'
        f"{inner}"
    )


def gradient_defs() -> str:
    return (
        '<linearGradient id="shell" x1="0" y1="0" x2="1" y2="1">'
        '<stop stop-color="#0b5e58"/><stop offset=".56" stop-color="#0c3438"/>'
        '<stop offset="1" stop-color="#284e88"/></linearGradient>'
        f'<radialGradient id="aura"><stop stop-color="{TEAL}" stop-opacity=".22"/>'
        f'<stop offset="1" stop-color="{TEAL}" stop-opacity="0"/></radialGradient>'
    )


# ---------------------------------------------------------------- identity
def identity_svg(cfg: dict, t: dict, photo: Path | None) -> str:
    word = cfg.get("wordmark") or cfg["name"].split()[0]
    skills = cfg.get("skills", [])[:6]
    chips = "".join(
        f'<g transform="translate({x} {chip_y})"><rect width="78" height="20" rx="10" '
        f'fill="#0d3636" stroke="#17675f"/><text x="39" y="14" text-anchor="middle" class="chip">'
        f"{escape(skill)}</text></g>"
        for x, skill in zip(chip_xs(len(skills)), skills)
    )
    css = (
        shared_style()
        + f".portrait-ascii{{font:700 5.9px {MONO};fill:{MINT}}}"
        + f".ascii{{font:700 11px {MONO};fill:{MINT};letter-spacing:.4px}}"
        + f".ascii-wide{{font:700 15px {MONO};fill:{MINT};letter-spacing:.4px}}"
        + f".chip{{font:700 8px {FONT};fill:{TEXT}}}"
        + ".phase-a{animation:phaseA 3.4s cubic-bezier(.32,.72,0,1) infinite}"
        + ".phase-b{animation:phaseB 3.4s cubic-bezier(.32,.72,0,1) infinite}"
        + "@keyframes phaseA{0%,42%{opacity:1}58%,92%{opacity:0}100%{opacity:1}}"
        + "@keyframes phaseB{0%,42%{opacity:0}58%,92%{opacity:1}100%{opacity:0}}"
    )

    if photo is not None:
        return _identity_with_portrait(cfg, t, photo, word, chips, css)
    return _identity_wordmark_only(cfg, t, word, chips, css)


def chip_xs(count: int) -> list[int]:
    return [48 + index * 87 for index in range(count)]


chip_y = 412


def _identity_wordmark_only(cfg: dict, t: dict, word: str, chips: str, css: str) -> str:
    first = ascii_lines(word, "$s+", scale_x=2, scale_y=2)
    second = ascii_lines(word, "#*=", scale_x=2, scale_y=2)
    rows = "".join(
        f'<text x="0" y="{20 + row * 19.5:.1f}" textLength="800" lengthAdjust="spacingAndGlyphs" '
        f'xml:space="preserve">{escape(line)}</text>'
        for row, line in enumerate(first)
    )
    rows_b = "".join(
        f'<text x="0" y="{20 + row * 19.5:.1f}" textLength="800" lengthAdjust="spacingAndGlyphs" '
        f'xml:space="preserve">{escape(line)}</text>'
        for row, line in enumerate(second)
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="470" viewBox="0 0 900 470" role="img" aria-label="Animated ASCII identity for {escape(cfg['name'])}">
<defs>{gradient_defs()}<clipPath id="type"><rect x="0" y="0" width="0" height="280"><animate attributeName="width" from="0" to="810" dur="2.5s" calcMode="spline" keySplines=".32 .72 0 1" fill="freeze"/></rect></clipPath><style>{css}</style></defs>
{shell(900, 470, f'<rect x="18" y="18" width="864" height="434" rx="17" fill="{BG}" stroke="#1a7269"/><circle cx="450" cy="230" r="210" fill="url(#aura)"/>')}
<circle cx="38" cy="37" r="5" fill="#ff665d"/><circle cx="56" cy="37" r="5" fill="#f5c451"/><circle cx="74" cy="37" r="5" fill="#46d468"/><text x="450" y="41" text-anchor="middle" class="mono">{escape(t["terminal"].format(user=cfg["username"].lower()))}</text>
<rect x="32" y="57" width="836" height="382" rx="22" fill="#081d1f" stroke="#176f68"/><text x="48" y="78" class="label">{escape(t["wordmark_label"].format(user=cfg["username"].upper()))}</text>
<g transform="translate(50 95)" clip-path="url(#type)" class="ascii-wide"><g class="phase-a">{rows}</g><g class="phase-b">{rows_b}</g></g>
<text x="48" y="400" class="body">{escape(trim(t.get("role") or cfg["role"], 74))} · {escape(t.get("location") or cfg["location"])}</text>{chips}
<rect x="50" y="93" width="6" height="18" fill="{MINT}" opacity="0"><set attributeName="opacity" to="1" begin="0s"/><animate attributeName="x" from="50" to="860" dur="2.5s" calcMode="spline" keySplines=".32 .72 0 1" fill="freeze"/><set attributeName="opacity" to="0" begin="2.5s"/></rect>
</svg>'''


def _identity_with_portrait(cfg: dict, t: dict, photo: Path, word: str, chips: str, css: str) -> str:
    portrait = portrait_lines(photo)
    defs, body = [], []
    char_w, line_h = 4.0, 5.3
    px, py = 43.0, 87.0
    for row, raw in enumerate(portrait):
        text = raw.rstrip()
        if not text.strip():
            continue
        left = len(text) - len(text.lstrip())
        segment = text[left:]
        x = px + left * char_w
        y = py + row * line_h
        width = len(segment) * char_w
        begin = row * 0.038
        defs.append(
            f'<clipPath id="portrait-row-{row}"><rect x="{x:.1f}" y="{y - 4.8:.1f}" width="{width:.1f}" '
            f'height="{line_h + 1:.1f}"><animate attributeName="width" from="0" to="{width:.1f}" '
            f'begin="{begin:.3f}s" dur=".32s" fill="freeze"/></rect></clipPath>'
        )
        body.append(
            f'<g clip-path="url(#portrait-row-{row})"><text x="{x:.1f}" y="{y:.1f}" textLength="{width:.1f}" '
            f'lengthAdjust="spacing" xml:space="preserve">{escape(segment)}</text></g>'
        )
        body.append(
            f'<rect x="{x:.1f}" y="{y - 4.8:.1f}" width="{char_w:.1f}" height="{line_h:.1f}" fill="{MINT}" '
            f'opacity="0"><set attributeName="opacity" to=".9" begin="{begin:.3f}s"/>'
            f'<animate attributeName="x" from="{x:.1f}" to="{x + width:.1f}" begin="{begin:.3f}s" dur=".32s" '
            f'fill="freeze"/><set attributeName="opacity" to="0" begin="{begin + .32:.3f}s"/></rect>'
        )
    first = ascii_lines(word, "$s+")
    second = ascii_lines(word, "#*=")
    rows = "".join(
        f'<text x="0" y="{20 + row * 14.2:.1f}" textLength="510" lengthAdjust="spacingAndGlyphs" '
        f'xml:space="preserve">{escape(line)}</text>'
        for row, line in enumerate(first)
    )
    rows_b = "".join(
        f'<text x="0" y="{20 + row * 14.2:.1f}" textLength="510" lengthAdjust="spacingAndGlyphs" '
        f'xml:space="preserve">{escape(line)}</text>'
        for row, line in enumerate(second)
    )
    chips_small = "".join(
        f'<g transform="translate({337 + index * 87} 329)"><rect width="78" height="20" rx="10" '
        f'fill="#0d3636" stroke="#17675f"/><text x="39" y="14" text-anchor="middle" class="chip">'
        f"{escape(skill)}</text></g>"
        for index, skill in enumerate(cfg.get("skills", [])[:6])
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="380" viewBox="0 0 900 380" role="img" aria-label="Animated ASCII identity for {escape(cfg['name'])}">
<defs>{gradient_defs()}{''.join(defs)}<clipPath id="type"><rect x="0" y="0" width="0" height="225"><animate attributeName="width" from="0" to="520" dur="2.5s" calcMode="spline" keySplines=".32 .72 0 1" fill="freeze"/></rect></clipPath><style>{css}</style></defs>
{shell(900, 380, f'<rect x="18" y="18" width="864" height="344" rx="17" fill="{BG}" stroke="#1a7269"/><circle cx="230" cy="185" r="180" fill="url(#aura)"/>')}
<circle cx="38" cy="37" r="5" fill="#ff665d"/><circle cx="56" cy="37" r="5" fill="#f5c451"/><circle cx="74" cy="37" r="5" fill="#46d468"/><text x="450" y="41" text-anchor="middle" class="mono">{escape(t["terminal"].format(user=cfg["username"].lower()))}</text>
<rect x="32" y="57" width="286" height="292" rx="22" fill="#081d1f" stroke="#176f68"/><text x="48" y="78" class="label">{escape(t["portrait_label"].format(user=cfg["username"].upper()))}</text><g class="portrait-ascii">{''.join(body)}</g>
<rect x="329" y="57" width="539" height="222" rx="22" fill="#081d1f" stroke="#176f68"/><g transform="translate(343 67)" clip-path="url(#type)" class="ascii"><g class="phase-a">{rows}</g><g class="phase-b">{rows_b}</g></g>
<text x="337" y="305" class="body">{escape(trim(t.get("role") or cfg["role"], 58))} · {escape(t.get("location") or cfg["location"])}</text>{chips_small}
<rect x="342" y="65" width="6" height="15" fill="{MINT}" opacity="0"><set attributeName="opacity" to="1" begin="0s"/><animate attributeName="x" from="342" to="852" dur="2.5s" calcMode="spline" keySplines=".32 .72 0 1" fill="freeze"/><set attributeName="opacity" to="0" begin="2.5s"/></rect>
</svg>'''


# ---------------------------------------------------------------- contributions
def calendar_layout(days: list[dict]) -> tuple[list[tuple[dict, int, int]], int]:
    if not days:
        return [], 53
    parsed = sorted(((date.fromisoformat(d["date"]), d) for d in days), key=lambda item: item[0])
    origin = parsed[0][0] - timedelta(days=(parsed[0][0].weekday() + 1) % 7)
    placed = [((current - origin).days // 7, (current.weekday() + 1) % 7, item) for current, item in parsed]
    return [(item, col, row) for col, row, item in placed], max(col for col, _, _ in placed) + 1


def contributions_svg(cfg: dict, contribution: dict, t: dict) -> str:
    placed, weeks = calendar_layout(contribution["days"][-371:])
    cell, gap = 12, 3
    pitch = cell + gap
    grid_width = weeks * pitch - gap
    grid_x = (900 - grid_width) // 2
    colors = ["#12393a", "#15504c", "#167b70", "#1aae9b", TEAL]
    nodes = []
    for item, col, row in placed:
        level = min(4, int(item.get("level", 0)))
        delay = ((col + row) % 18) * 0.025
        nodes.append(
            f'<rect x="{grid_x + col * pitch}" y="{100 + row * pitch}" width="{cell}" height="{cell}" rx="2" '
            f'fill="{colors[level]}" class="cell" style="animation-delay:{delay:.3f}s">'
            f'<title>{escape(item["date"])}: {item.get("count", 0)}</title></rect>'
        )
    css = (
        shared_style()
        + ".cell{animation:cellIn .55s cubic-bezier(.32,.72,0,1) both}"
        + ".ship{animation:travel 12s cubic-bezier(.65,0,.35,1) infinite}"
        + ".shot-a{animation:shoot 1.7s cubic-bezier(.32,.72,0,1) infinite}"
        + ".shot-b{animation:shoot 1.7s .72s cubic-bezier(.32,.72,0,1) infinite}"
        + "@keyframes cellIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}"
        + "@keyframes travel{0%,100%{transform:translateX(0)}50%{transform:translateX(715px)}}"
        + "@keyframes shoot{0%{opacity:0;transform:translateY(0) scaleY(.4)}18%{opacity:1}"
        + "75%,100%{opacity:0;transform:translateY(-58px) scaleY(1)}}"
    )
    legend = "".join(
        f'<rect x="{750 + i * 14}" y="52" width="10" height="10" rx="2" fill="{color}"/>'
        for i, color in enumerate(colors)
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="292" viewBox="0 0 900 292" role="img" aria-label="{escape(t["contrib_title"])}">
<defs>{gradient_defs()}<style>{css}</style></defs>
{shell(900, 292, f'<rect x="28" y="28" width="844" height="236" rx="18" fill="{PANEL}" stroke="#24a596"/>')}
<text x="48" y="60" class="title">{escape(t["contrib_title"])}</text><text x="49" y="79" class="label">{escape(t["contrib_sub"].format(n=contribution["total"]))}</text><text x="712" y="62" class="mono">{escape(t["less"])}</text>{legend}<text x="847" y="62" text-anchor="end" class="mono">{escape(t["more"])}</text>
{''.join(nodes)}
<path d="M65 235H835" stroke="#174541" stroke-dasharray="2 7"/>
<g class="ship"><g transform="translate(72 240)"><g class="shot-a"><rect x="12" y="-21" width="3" height="14" rx="2" fill="{MINT}"/><circle cx="13.5" cy="-24" r="3" fill="{MINT}"/></g><g class="shot-b"><rect x="12" y="-21" width="3" height="14" rx="2" fill="{BLUE}"/><circle cx="13.5" cy="-24" r="3" fill="{BLUE}"/></g><path d="M13 0L25 27l-12-6-12 6z" fill="{MINT}" stroke="#d9fff8"/><path d="M13 9L18 23H8z" fill="{BLUE}"/><path d="M5 24l-4 9 9-6M21 24l4 9-9-6" fill="none" stroke="{TEAL}" stroke-width="2"/><path d="M9 29l4 10 4-10" fill="{ORANGE}" opacity=".85"/></g></g>
<text x="847" y="252" text-anchor="end" class="label">{escape(t["contrib_foot"])}</text>
</svg>'''


# ---------------------------------------------------------------- signal
def signal_svg(cfg: dict, profile: dict, contribution: dict, t: dict) -> str:
    values = [
        (t["metrics"][0], profile["stats"]["totalStars"], TEAL),
        (t["metrics"][1], contribution["total"], PURPLE),
        (t["metrics"][2], profile["stats"]["ownRepos"], BLUE),
        (t["metrics"][3], profile["user"]["followers"], "#32d8ef"),
    ]
    top = max(1, max(value for _, value, _ in values))
    cards = []
    for index, (label, value, color) in enumerate(values):
        x = 42 + index * 211
        progress = max(18, int(132 * (value / top) ** 0.5))
        cards.append(
            f'<g transform="translate({x} 83)"><rect width="190" height="112" rx="18" fill="{PANEL_2}" '
            f'stroke="#1aa595"/><text x="22" y="30" class="label">{escape(label)}</text>'
            f'<text x="22" y="70" class="metric" fill="{color}"><tspan fill="{color}">{value}</tspan></text>'
            f'<rect x="22" y="88" width="144" height="7" rx="4" fill="#203b40"/>'
            f'<rect x="22" y="88" width="{progress}" height="7" rx="4" fill="{color}" class="bar" '
            f'style="animation-delay:{index * .1:.2f}s"/></g>'
        )
    languages = profile["stats"]["languages"][:5] or [(skill, 1) for skill in cfg.get("skills", [])[:5]]
    total = max(1, sum(int(count) for _, count in languages))
    palette = [YELLOW, BLUE, PURPLE, GREEN, ORANGE]
    nodes = []
    for index, (language, count) in enumerate(languages):
        y = 362 + index * 29
        percent = round(int(count) / total * 100)
        width = max(16, int(510 * int(count) / total))
        color = palette[index]
        nodes.append(
            f'<circle cx="62" cy="{y - 4}" r="5" fill="{color}"/>'
            f'<text x="82" y="{y}" class="language">{escape(language)}</text>'
            f'<text x="285" y="{y}" text-anchor="end" class="percent" fill="{color}">'
            f'<tspan fill="{color}">{percent}%</tspan></text>'
            f'<rect x="315" y="{y - 12}" width="510" height="9" rx="5" fill="#224043"/>'
            f'<rect x="315" y="{y - 12}" width="{width}" height="9" rx="5" fill="{color}" class="bar" '
            f'style="animation-delay:{.15 + index * .08:.2f}s"/>'
        )
    css = (
        shared_style()
        + f".metric{{font:700 34px {FONT}}}"
        + f".language{{font:700 12px {FONT};fill:{TEXT}}}"
        + f".percent{{font:700 11px {MONO}}}"
        + ".bar{transform-origin:left;animation:grow .85s cubic-bezier(.32,.72,0,1) both}"
        + "@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}"
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520" role="img" aria-label="{escape(t["signal_title"])}">
<defs>{gradient_defs()}<style>{css}</style></defs>
{shell(900, 520, f'<rect x="6" y="6" width="888" height="238" rx="20" fill="url(#shell)" stroke="{HAIR}"/><rect x="24" y="24" width="852" height="202" rx="18" fill="{PANEL}" stroke="#1ca596"/><rect x="6" y="258" width="888" height="256" rx="20" fill="url(#shell)" stroke="{HAIR}"/><rect x="24" y="276" width="852" height="220" rx="18" fill="{PANEL}" stroke="#1ca596"/>')}
<text x="42" y="61" class="title">{escape(t["signal_title"])}</text><text x="43" y="78" class="label">{escape(t["signal_sub"].format(user=cfg["username"].upper()))}</text>{''.join(cards)}
<text x="43" y="312" class="title">{escape(t["stack_title"])}</text><text x="43" y="330" class="label">{escape(t["stack_sub"])}</text><text x="849" y="312" text-anchor="end" class="label">{escape(t["stack_scan"])}</text>{''.join(nodes)}
<text x="849" y="490" text-anchor="end" class="mono">{escape(trim(t.get("status") or cfg["status"], 62))}</text>
</svg>'''


# ---------------------------------------------------------------- README
def slots(profile: dict, contribution: dict) -> dict:
    langs = profile["stats"]["languages"]
    top = langs[0] if langs else ("—", 0)
    total_lang = max(1, sum(count for _, count in langs))
    return {
        "repos": profile["stats"]["ownRepos"],
        "forks": profile["stats"]["forks"],
        "stars": profile["stats"]["totalStars"],
        "followers": profile["user"]["followers"],
        "contributions": contribution["total"],
        "activeDays": contribution["activeDays"],
        "peak": contribution["peakCount"],
        "peakDay": contribution["peakDay"],
        "last90": contribution["last90"],
        "windowDays": contribution["windowDays"],
        "topLang": top[0],
        "topLangPct": f"{top[1] / total_lang * 100:.1f}",
        "langCount": len(langs),
        "since": profile["user"]["createdAt"][:4],
    }


def fill(text: str, ctx: dict) -> str:
    out = str(text)
    for key, value in ctx.items():
        out = out.replace("{" + key + "}", str(value))
    return out


def switcher(lang: str, labels: dict) -> str:
    parts = []
    for code in LANGS:
        name = labels[code]
        href = "README.md" if code == DEFAULT_LANG else f"README.{code}.md"
        parts.append(f"**[{name}]({href})**" if code == lang else f"[{name}]({href})")
    return " · ".join(parts)


def render_readme(cfg: dict, profile: dict, contribution: dict, lang: str, labels: dict) -> str:
    content = json.loads((I18N / f"{lang}.json").read_text(encoding="utf-8"))
    ctx = slots(profile, contribution)
    t = lambda s: fill(s, ctx)  # noqa: E731
    svg = lambda name: f"assets/{name}-{lang}.svg"  # noqa: E731
    L = content["labels"]

    def repo_of(name: str) -> dict | None:
        return next((r for r in profile["repos"] if r["name"] == name), None)

    # ---- project grid: two columns, image on top, one line, one link
    cells = []
    for item in content["projects"]:
        repo = repo_of(item["repo"])
        url = repo["url"] if repo else f"https://github.com/{cfg['username']}/{item['repo']}"
        star = f' · ★{repo["stars"]}' if repo and repo["stars"] else ""
        head = (
            f'<a href="{item["link"]}"><img src="{item["image"]}" width="440" alt="{escape(item["name"])}"></a>'
            if item.get("image")
            else ""
        )
        cells.append(
            f'<td width="50%" valign="top">{head}'
            f'<p><strong><a href="{url}">{escape(item["name"])}</a></strong>{star}</p>'
            f'<p>{t(item["line"])}</p>'
            f'<p><a href="{item["link"]}">{escape(item["link_label"])} ↗</a></p></td>'
        )
    rows = []
    for i in range(0, len(cells), 2):
        pair = cells[i : i + 2]
        if len(pair) == 1:
            pair.append('<td width="50%"></td>')
        rows.append("<tr>" + "".join(pair) + "</tr>")
    grid = "<table>\n" + "\n".join(rows) + "\n</table>"

    # ---- toolchain rows
    tool_rows = "\n".join(
        f'| **[{item["repo"]}](https://github.com/{cfg["username"]}/{item["repo"]})** | {t(item["line"])} '
        f'| {item.get("cmd") or "—"} |'
        for item in content["toolchain"]
    )

    # ---- upstream merged PRs
    upstream = profile.get("upstream") or []
    if upstream:
        grouped: dict[str, list[dict]] = {}
        for pr in upstream:
            grouped.setdefault(pr["repo"], []).append(pr)
        pr_rows = "\n".join(
            f'| [{repo}](https://github.com/{repo}) | '
            + " · ".join(f'[{pr["number"]}]({pr["url"]})' for pr in prs)
            + f' | {escape(prs[0]["title"])} |'
            for repo, prs in grouped.items()
        )
        upstream_block = (
            f'| {L["repo"]} | {L["merged_prs"]} | {L["latest_change"]} |\n| --- | --- | --- |\n{pr_rows}'
        )
    else:
        upstream_block = content["upstream_empty"]

    # ---- objective rows
    okr_rows = "\n".join(
        f"| **{row['id']}** {t(row['objective'])} | {t(row['kr'])} | {t(row['evidence'])} | {t(row['means'])} |"
        for row in content["okr"]
    )

    stack_rows = "\n".join(
        f"| {index + 1} | **{row['tech']}** | {t(row['scene'])} |"
        for index, row in enumerate(content["stack"])
    )

    now = content["now"]
    contact_links = " · ".join(f"[{label}]({url})" for label, url in content["contact"]["links"])
    top_links = " · ".join(f'<a href="{url}">{escape(label)}</a>' for label, url in content["links"])

    return f'''<div align="center">

<a href="{content["hero_link"]}"><img src="assets/hero-game.jpg" width="1200" alt="{escape(content["hero_alt"])}"></a>

# {escape(cfg["name"])}

**{t(content["tagline"])}**

<sub>{t(content["subline"])}</sub>

{top_links} · {switcher(lang, labels)}

</div>

---

## 01 · {content['sections']['selected']}

{grid}

## 02 · {content['sections']['toolchain']}

| {L['tool']} | {L['what']} | {L['install']} |
| --- | --- | --- |
{tool_rows}

## 03 · {content['sections']['upstream']}

{t(content['upstream_note'])}

{upstream_block}

## 04 · {content['sections']['now']}

| | |
| --- | --- |
| **{L['problem']}** | {t(now['problem'])} |
| **{L['judgment']}** | {t(now['judgment'])} |
| **{L['next']}** | {t(now['next'])} |

## 05 · {content['sections']['objective']}

| {L['objective']} | {L['kr']} | {L['evidence']} | {L['means']} |
| --- | --- | --- | --- |
{okr_rows}

<details>
<summary><strong>{content['sections']['stack']}</strong></summary>

| # | {L['tech']} | {L['scene']} |
| --- | --- | --- |
{stack_rows}

<div align="center"><img src="{svg('signal')}" width="900" alt="{escape(L['signal_alt'])}"></div>

</details>

<div align="center"><img src="{svg('identity')}" width="900" alt="{escape(cfg['name'])} — animated ASCII identity"></div>

## 06 · {content['sections']['contact']}

{t(content['contact']['line'])}

{contact_links}

<div align="center"><img src="{svg('contributions')}" width="900" alt="{escape(L['contrib_alt'])}"></div>

<sub>{t(content['footer'])}</sub>
'''


# ---------------------------------------------------------------- verify
def verify(readmes: list[Path]) -> int:
    problems = 0
    for path in sorted(ASSETS.glob("*.svg")):
        try:
            ElementTree.parse(path)
        except ElementTree.ParseError as exc:
            problems += 1
            print(f"  BAD  {path.name}: {exc}")
    for path in readmes:
        body = path.read_text(encoding="utf-8")
        for ref in set(re.findall(r'src="(assets/[^"]+)"', body)):
            if not (ROOT / ref).exists():
                problems += 1
                print(f"  MISS {path.name} -> {ref}")
        if "http" in "".join(re.findall(r'src="([^"]+)"', body)):
            problems += 1
            print(f"  REMOTE image in {path.name}")
    print(f"verify: {len(list(ASSETS.glob('*.svg')))} svg, {len(readmes)} readme, {problems} problem(s)")
    return problems


# ---------------------------------------------------------------- main
def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo", action="store_true", help="deterministic offline data")
    parser.add_argument("--offline", action="store_true", help="reuse data/profile.json")
    parser.add_argument("--lang", choices=LANGS, help="render a single language")
    args = parser.parse_args()

    cfg = load_config()
    username = os.environ.get("GH_USERNAME") or cfg["username"]
    cfg["username"] = username

    cache = DATA / "profile.json"
    if args.demo:
        profile, contribution = demo_data()
    elif args.offline:
        if not cache.exists():
            raise SystemExit("data/profile.json missing; run without --offline first")
        payload = json.loads(cache.read_text(encoding="utf-8"))
        profile, contribution = payload["profile"], payload["contributions"]
    else:
        profile = fetch_profile(username)
        contribution = fetch_contributions(username)
        profile["upstream"] = fetch_upstream(username)
        DATA.mkdir(exist_ok=True)
        cache.write_text(
            json.dumps({"profile": profile, "contributions": contribution}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    labels = {code: json.loads((I18N / f"{code}.json").read_text(encoding="utf-8"))["label"] for code in LANGS}
    photo = ROOT / cfg["photo"] if cfg.get("photo") and (ROOT / cfg["photo"]).exists() else None

    ASSETS.mkdir(exist_ok=True)
    targets = [args.lang] if args.lang else LANGS
    readmes = []
    for lang in targets:
        t = json.loads((I18N / f"{lang}.json").read_text(encoding="utf-8"))["svg"]
        (ASSETS / f"identity-{lang}.svg").write_text(identity_svg(cfg, t, photo), encoding="utf-8")
        (ASSETS / f"contributions-{lang}.svg").write_text(
            contributions_svg(cfg, contribution, t), encoding="utf-8"
        )
        (ASSETS / f"signal-{lang}.svg").write_text(signal_svg(cfg, profile, contribution, t), encoding="utf-8")
        name = "README.md" if lang == DEFAULT_LANG else f"README.{lang}.md"
        path = ROOT / name
        path.write_text(render_readme(cfg, profile, contribution, lang, labels), encoding="utf-8")
        readmes.append(path)
        print(f"[render] {lang:<6} -> {name} + 3 svg")

    return 1 if verify(readmes) else 0


if __name__ == "__main__":
    sys.exit(main())
