#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
node scripts/render.mjs >/dev/null 2>&1
node scripts/score.mjs
PLAYWRIGHT_ROOT="${PLAYWRIGHT_ROOT:-/d/codingProjects/临时/tihuqiche}" node scripts/pixels.mjs
