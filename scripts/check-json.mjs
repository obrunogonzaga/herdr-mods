// Parses every JSON file in the repo, so a typo in a layout, a theme or a
// key map fails in CI instead of in the app.
//
//   node scripts/check-json.mjs [dir]

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SKIP_DIRS = new Set([".git", "node_modules"]);

function jsonFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...jsonFiles(path));
    else if (path.endsWith(".json")) found.push(path);
  }
  return found;
}

export function parseJsonFiles(paths, root) {
  const failures = [];
  for (const path of paths) {
    try {
      JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      failures.push(`${relative(root, path)}: ${error.message}`);
    }
  }
  return failures;
}

function main() {
  const root = process.argv[2] ?? process.cwd();
  const failures = parseJsonFiles(jsonFiles(root), root);
  for (const failure of failures) console.error(failure);
  if (failures.length) {
    console.error(`${failures.length} file(s) are not valid JSON`);
    process.exit(1);
  }
  console.log("all JSON files parse");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) main();
