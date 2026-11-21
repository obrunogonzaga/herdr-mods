#!/usr/bin/env bash
set -euo pipefail

APP_HOME="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$APP_HOME/.herdr-mods-manifest"

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
  for theme in "$item"/themes/*.json; do
    [ -f "$theme" ] || continue
    cp "$theme" "$APP_HOME/themes/"
  done
}

# The repo's mods, by name: what sync puts in the app's mods/ folder.
repo_mods() {
  for item in "$REPO_DIR"/*/; do
    [ -d "$item/mods" ] || continue
    for mod in "$item"/mods/*/; do
      [ -d "$mod" ] || continue
      basename "$mod"
    done
  done
}

# A mod the repo renamed or dropped stays in the app's folder and breaks the
# layout that names it. The manifest says what the last sync installed.
remove_stale_mods() {
  local current stale
  current="$(repo_mods | sort -u)"
  if [ -f "$MANIFEST" ]; then
    while read -r stale; do
      [ -n "$stale" ] || continue
      echo "$current" | grep -qx "$stale" && continue
      rm -rf "$APP_HOME/mods/$stale"
      echo "removed stale mod: $stale"
    done < "$MANIFEST"
  fi
  printf '%s\n' "$current" > "$MANIFEST"
}

sync_personal_config() {
  local config="$REPO_DIR/personal/ideas.json"
  [ -f "$config" ] && cp "$config" "$APP_HOME/ideas.json"
  return 0
}

sync_personal_keys() {
  local keys="$REPO_DIR/personal/keys.json" target="$APP_HOME/keys.json"
  [ -f "$keys" ] || return 0
  cmp -s "$keys" "$target" && return 0
  [ -f "$target" ] && cp "$target" "$target.bak-$(date +%Y%m%d%H%M%S)"
  cp "$keys" "$target"
  echo "keys.json updated"
}

# The app writes settings.json itself (zoom, appearance), so the repo's file
# merges into it: the keys the repo names win, the rest stay as the app left them.
sync_personal_settings() {
  local enforced="$REPO_DIR/personal/settings.json"
  [ -f "$enforced" ] || return 0
  node "$REPO_DIR/scripts/merge-settings.mjs" "$APP_HOME/settings.json" "$enforced" "$APP_HOME/settings.json"
}

# programs.json is only read, so the repo's copy replaces it whole.
sync_personal_programs() {
  local programs="$REPO_DIR/personal/programs.json" target="$APP_HOME/programs.json"
  [ -f "$programs" ] || return 0
  cmp -s "$programs" "$target" && return 0
  [ -f "$target" ] && cp "$target" "$target.bak-$(date +%Y%m%d%H%M%S)"
  cp "$programs" "$target"
  echo "programs.json updated"
}

# The program table points at these; the app's own icons/ folder is written by Herdr.
sync_personal_icons() {
  local icons="$REPO_DIR/personal/icons" target="$APP_HOME/personal-icons"
  [ -d "$icons" ] || return 0
  mkdir -p "$target"
  rsync -a "$icons/" "$target/"
}

for item in "$REPO_DIR"/*/; do
  [ -d "$item/mods" ] || [ -d "$item/layouts" ] || continue
  sync_item "${item%/}"
done
remove_stale_mods
sync_personal_keys
sync_personal_config
sync_personal_settings
sync_personal_programs
sync_personal_icons
