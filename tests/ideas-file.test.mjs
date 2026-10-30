import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIdeas, addIdea, toggleIdea, linkIssue, deleteIdea, tagsOf } from "../ideas-panel/mods/ideas/ideas-file.js";

const FILE = [
  "---", "type: backlog", "---", "", "# Ideias", "", "Some intro text.", "",
  "- [ ] Review queue panel #herdr #github", "  added 2026-10-30 · repo herdr-mods",
  "- [x] CI badge #herdr", "  added 2026-10-28 · done 2026-10-30",
  "- [ ] Backup script #infra",
  "", "## Notes", "- a plain bullet, not an idea", "",
].join("\n");
const today = "2026-11-01";

test("parseIdeas_markdownFile_readsItemsAndMeta", () => {
  const ideas = parseIdeas(FILE);
  assert.deepEqual(ideas.map((i) => [i.title, i.done, i.tags, i.added, i.repo, i.doneAt]), [
    ["Review queue panel", false, ["herdr", "github"], "2026-10-30", "herdr-mods", null],
    ["CI badge", true, ["herdr"], "2026-10-28", null, "2026-10-30"],
    ["Backup script", false, ["infra"], null, null, null],
  ]);
});

test("tagsOf_accentsAndSlashes_keepsThemLowercased", () => {
  assert.deepEqual(tagsOf("Ideia #Automação #infra/vps e não#isso"), ["automação", "infra/vps"]);
});

test("addIdea_fileWithIdeas_insertsAfterLastIdea", () => {
  const out = addIdea(FILE, "  Linear   panel #herdr ", { today, repo: "herdr-mods" });
  const lines = out.split("\n");
  const at = lines.indexOf("- [ ] Linear panel #herdr");
  assert.equal(lines[at - 1], "- [ ] Backup script #infra");
  assert.equal(lines[at + 1], "  added 2026-11-01 · repo herdr-mods");
  assert.ok(out.includes("## Notes\n- a plain bullet, not an idea"));
});

test("addIdea_fileWithoutIdeas_appendsAtEnd", () => {
  assert.equal(addIdea("# Ideias\n", "First", { today }), "# Ideias\n\n- [ ] First\n  added 2026-11-01\n");
  assert.equal(addIdea("", "First", { today }), "- [ ] First\n  added 2026-11-01\n");
  assert.equal(addIdea(FILE, "   ", { today }), FILE);
});

test("toggleIdea_openAndDone_flipsAndStampsDoneDate", () => {
  const done = toggleIdea(FILE, 0, { today });
  assert.ok(done.includes("- [x] Review queue panel #herdr #github\n  added 2026-10-30 · repo herdr-mods · done 2026-11-01"));
  const reopened = toggleIdea(FILE, 1, { today });
  assert.ok(reopened.includes("- [ ] CI badge #herdr\n  added 2026-10-28\n"));
  const noMeta = toggleIdea(FILE, 2, { today });
  assert.ok(noMeta.includes("- [x] Backup script #infra\n  added 2026-11-01 · done 2026-11-01\n"));
  assert.equal(parseIdeas(noMeta).length, 3);
});

test("linkIssue_idea_addsIssueToMeta", () => {
  const out = linkIssue(FILE, 0, "https://github.com/o/r/issues/7", { today });
  assert.equal(parseIdeas(out)[0].issue, "https://github.com/o/r/issues/7");
  assert.ok(out.includes("  added 2026-10-30 · repo herdr-mods · issue https://github.com/o/r/issues/7"));
});

test("deleteIdea_ideaWithAndWithoutMeta_removesOnlyItsLines", () => {
  const out = deleteIdea(deleteIdea(FILE, 1), 1);
  assert.deepEqual(parseIdeas(out).map((i) => i.title), ["Review queue panel"]);
  assert.ok(out.startsWith("---\ntype: backlog\n---"));
  assert.ok(out.includes("## Notes\n- a plain bullet, not an idea"));
  assert.equal(deleteIdea(FILE, 9), FILE);
});
