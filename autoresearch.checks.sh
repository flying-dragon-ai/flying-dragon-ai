#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
# Hard gates: every SVG must be well-formed, every mode must render, and the
# numbers baked into the cards must match data/profile.json.
node scripts/verify.mjs --offline 2>&1 | grep -E "BAD|MISS|STALE|verify:" | tail -6
