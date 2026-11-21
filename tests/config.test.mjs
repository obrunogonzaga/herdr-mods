import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJsonFiles } from "../scripts/check-json.mjs";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("..", import.meta.url).pathname;

test("parseJsonFiles_validFile_returnsNoFailures", () => {
  const dir = mkdtempSync(join(tmpdir(), "herdr-json-"));
  const path = join(dir, "a.json");
  writeFileSync(path, JSON.stringify({ a: 1 }));
  assert.deepEqual(parseJsonFiles([path], dir), []);
});

test("parseJsonFiles_brokenFile_reportsIt", () => {
  const dir = mkdtempSync(join(tmpdir(), "herdr-json-"));
  const path = join(dir, "a.json");
  writeFileSync(path, "{ nope");
  const failures = parseJsonFiles([path], dir);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /a\.json/);
});

test("parseJsonFiles_repoFiles_allParse", () => {
  const files = [
    "aifbr/layouts/aifbr.json",
    "aifbr/themes/aifbr-dark.json",
    "aifbr/themes/aifbr-light.json",
    "aifbr/mods/aifbr-tabs/mod.json",
    "aifbr/mods/aifbr-chrome/mod.json",
    "personal/keys.json",
    "personal/settings.json",
    "personal/programs.json",
    "personal/ideas.json",
    "personal/layouts/my-layout.json",
    "github-panel/mods/github/mod.json",
    "github-panel/mods/issue-agent/mod.json",
    "ideas-panel/mods/ideas/mod.json",
    "servers-panel/mods/servers/mod.json",
  ].map((file) => join(repo, file));
  assert.deepEqual(parseJsonFiles(files, repo), []);
});

test("programs_iconsExistInRepo", () => {
  const programs = JSON.parse(readFileSync(join(repo, "personal/programs.json"), "utf8"));
  for (const [key, entry] of Object.entries(programs.programs)) {
    if (!entry.icon?.startsWith("personal-icons/")) continue;
    const file = join(repo, "personal/icons", entry.icon.replace("personal-icons/", ""));
    assert.ok(existsSync(file), `${key} points at a missing icon: ${entry.icon}`);
  }
});

test("aifbrLayout_referencesOnlySelfContainedOrShippedMods", () => {
  const layout = JSON.parse(readFileSync(join(repo, "aifbr/layouts/aifbr.json"), "utf8"));
  const bundled = new Set(["aifbr-chrome", "aifbr-tabs"]);
  const shipped = new Set(["spaces", "agents", "workspace-chrome", "files", "changes", "workspace-status", "pane"]);
  const referenced = [];
  const walk = (node) => {
    if (!node) return;
    if (node.content?.mod) referenced.push(node.content.mod);
    if (node.content?.pane?.header?.content?.mod) referenced.push(node.content.pane.header.content.mod);
    for (const child of node.children ?? []) walk(child);
  };
  walk(layout);
  for (const mod of referenced) {
    assert.ok(bundled.has(mod) || shipped.has(mod), `aifbr.json references external mod: ${mod}`);
  }
});
