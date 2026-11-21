import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeSettings, mergeSettingsFile } from "../scripts/merge-settings.mjs";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("mergeSettings_repoKeysWin", () => {
  assert.deepEqual(mergeSettings({ zoom: 1.3, terminal_line_height: 1.0 }, { terminal_line_height: 1.15 }), {
    zoom: 1.3,
    terminal_line_height: 1.15,
  });
});

test("mergeSettings_keepsLiveKeysRepoDoesNotName", () => {
  const merged = mergeSettings({ zoom: 1.3, appearance: "dark", telemetry: false }, { pane_scrollbars: false });
  assert.equal(merged.zoom, 1.3);
  assert.equal(merged.appearance, "dark");
  assert.equal(merged.telemetry, false);
  assert.equal(merged.pane_scrollbars, false);
});

test("mergeSettings_mergesNestedObjects", () => {
  const merged = mergeSettings({ worktrees: { directory: "/a", extra: 1 } }, { worktrees: { directory: "/b" } });
  assert.deepEqual(merged.worktrees, { directory: "/b", extra: 1 });
});

test("mergeSettings_replacesArrays", () => {
  const merged = mergeSettings({ sounds: { enabled: true } }, { sounds: { enabled: true } });
  assert.deepEqual(merged.sounds, { enabled: true });
});

test("mergeSettingsFile_writesMergedFile", () => {
  const dir = mkdtempSync(join(tmpdir(), "herdr-merge-"));
  const live = join(dir, "settings.json");
  const enforced = join(dir, "enforced.json");
  const out = join(dir, "out.json");
  writeFileSync(live, JSON.stringify({ zoom: 1.3 }));
  writeFileSync(enforced, JSON.stringify({ pane_scrollbars: false }));

  assert.equal(mergeSettingsFile(live, enforced, out), true);
  assert.deepEqual(JSON.parse(readFileSync(out, "utf8")), { zoom: 1.3, pane_scrollbars: false });

  assert.equal(mergeSettingsFile(live, enforced, out), false);
});

test("mergeSettingsFile_missingLiveFileStartsFromRepo", () => {
  const dir = mkdtempSync(join(tmpdir(), "herdr-merge-"));
  const enforced = join(dir, "enforced.json");
  const out = join(dir, "out.json");
  writeFileSync(enforced, JSON.stringify({ pane_scrollbars: false }));

  assert.equal(mergeSettingsFile(join(dir, "missing.json"), enforced, out), true);
  assert.deepEqual(JSON.parse(readFileSync(out, "utf8")), { pane_scrollbars: false });
});
