# Setup

Five localized READMEs, fifteen animated SVGs, one generator. Everything is derived from
`config.json` plus live GitHub data fetched through the `gh` CLI.

## Layout

```text
flying-dragon-ai/
├── README.md              # English (default, rendered on the profile)
├── README.zh-CN.md        # 简体中文
├── README.ja.md           # 日本語
├── README.ko.md           # 한국어
├── README.ru.md           # Русский
├── config.json            # identity: wordmark, role, skills, status
├── assets/
│   ├── identity-<lang>.svg        # ASCII wordmark + terminal chrome
│   ├── signal-<lang>.svg          # live stats + language stack
│   └── contributions-<lang>.svg   # 12-month contribution field
├── data/profile.json      # last fetch, used by --offline
├── scripts/
│   ├── generate.py        # the only entry point
│   ├── requirements.txt   # Pillow
│   └── i18n/<lang>.json   # all prose, per language
└── .github/workflows/refresh.yml
```

## Run it

```bash
python -m pip install -r scripts/requirements.txt
python scripts/generate.py            # live data via gh, renders everything
python scripts/generate.py --offline  # reuse data/profile.json, no network
python scripts/generate.py --demo     # deterministic fake data, offline preview
python scripts/generate.py --lang ja  # one language only
```

`generate.py` exits non-zero if any SVG fails to parse, any referenced asset is missing,
or any README points at a remote image.

## Change the identity

Edit `config.json`:

| key | meaning |
| --- | --- |
| `username` | GitHub login; overridden by `GH_USERNAME` in CI |
| `name` | display name |
| `wordmark` | the big ASCII text, `A–Z`, `0–9`, space, max 8 characters |
| `role` / `location` | the line under the wordmark (per-language overrides live in `i18n/*.json` under `svg.role`) |
| `status` | footer line inside the signal card |
| `photo` | optional portrait; see below |
| `skills` | up to six chips |

## Optional portrait

Drop a portrait at `assets/profile-source.png` and rerun. The identity card switches from the
full-width wordmark layout to the two-panel layout: ASCII portrait on the left, wordmark on the
right. Best results: high resolution, strong subject/background contrast, plain light background,
roughly square crop. Delete the file to go back to the wordmark-only layout.

## Change the prose

Every sentence lives in `scripts/i18n/<lang>.json`. Numbers are injected as `{slots}` from the
fetch — `{contributions}`, `{activeDays}`, `{peak}`, `{repos}`, `{stars}`, `{followers}`,
`{langCount}`, `{since}`. Never hardcode a number in the JSON; it will drift from the SVG.

## Automatic refresh

`.github/workflows/refresh.yml` runs daily at 03:17 UTC and on any push that touches
`scripts/**` or `config.json`. It needs `Settings → Actions → General → Workflow permissions →
Read and write permissions`.

## Attribution

The layout, the animation timing and the ASCII glyph alphabet are derived from
[Aqua-Launch](https://github.com/Jenesyx/pretty-github/tree/master/Aqua-Launch) (MIT,
© 2026 Arta Bidkhori). The generator here is a rewrite: `gh` instead of raw HTTP, five
languages instead of one, and a wordmark-only layout when no portrait is supplied.
