#!/usr/bin/env bash
# Install the burn-tokens skill into ~/.claude/skills/burn-tokens/
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
DST="${HOME}/.claude/skills/burn-tokens"

mkdir -p "$(dirname "$DST")"

if [[ -e "$DST" ]]; then
  echo "→ Backing up existing $DST to $DST.backup"
  rm -rf "$DST.backup"
  mv "$DST" "$DST.backup"
fi

cp -R "$SRC" "$DST"
chmod +x "$DST/furnace.mjs" 2>/dev/null || true

echo "✓ Installed burn-tokens skill to $DST"
echo
echo "Test it:"
echo "    node $DST/furnace.mjs --duration 4"
echo
echo "In Claude Code, ask: 'burn tokens' or '/burn-tokens'."
