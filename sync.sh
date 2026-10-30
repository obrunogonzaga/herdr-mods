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

sync_personal_keys() {
  local keys="$REPO_DIR/personal/keys.json" target="$APP_HOME/keys.json"
  [ -f "$keys" ] || return 0
  cmp -s "$keys" "$target" && return 0
  [ -f "$target" ] && cp "$target" "$target.bak-$(date +%Y%m%d%H%M%S)"
  cp "$keys" "$target"
  echo "keys.json updated"
}

for item in "$REPO_DIR"/*/; do
  [ -d "$item/mods" ] || [ -d "$item/layouts" ] || continue
  sync_item "${item%/}"
done
sync_personal_keys
