#!/usr/bin/env bash
set -euo pipefail

APP_HOME="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

sync_item() {
  local item="$1"
  for mod in "$item"/mods/*/; do
    [ -d "$mod" ] || continue
    rsync -a --exclude jsconfig.json --exclude gpui-kit.d.ts "$mod" "$APP_HOME/mods/$(basename "$mod")/"
    herdr-app check "$APP_HOME/mods/$(basename "$mod")"
  done
  for layout in "$item"/layouts/*.json; do
    [ -f "$layout" ] || continue
    cp "$layout" "$APP_HOME/layouts/"
  done
}

for item in "$REPO_DIR"/*/; do
  [ -d "$item/mods" ] || [ -d "$item/layouts" ] || continue
  sync_item "${item%/}"
done
