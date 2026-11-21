// Merges the repo's settings into the app's, keeping every key the repo doesn't name.
//
// The app writes settings.json itself (zoom, appearance, and the defaults it fills in),
// so a plain copy would fight it. The repo file names only the keys it owns: those win,
// everything else in the app's file stays.
//
//   node scripts/merge-settings.mjs <live.json> <enforced.json> <out.json>

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeSettings(live, enforced) {
  const merged = { ...live };
  for (const [key, value] of Object.entries(enforced)) {
    merged[key] = isPlainObject(value) && isPlainObject(live[key])
      ? mergeSettings(live[key], value)
      : value;
  }
  return merged;
}

export function readJson(path) {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function mergeSettingsFile(livePath, enforcedPath, outPath) {
  const live = readJson(livePath);
  const merged = mergeSettings(live, readJson(enforcedPath));
  const text = `${JSON.stringify(merged, null, 2)}\n`;
  if (existsSync(outPath) && readFileSync(outPath, "utf8") === text) return false;
  writeFileSync(outPath, text);
  return true;
}

function main() {
  const [livePath, enforcedPath, outPath] = process.argv.slice(2);
  if (!livePath || !enforcedPath || !outPath) {
    console.error("usage: merge-settings.mjs <live.json> <enforced.json> <out.json>");
    process.exit(1);
  }
  if (mergeSettingsFile(livePath, enforcedPath, outPath)) console.log("settings.json updated");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
