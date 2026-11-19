import { test } from "node:test";
import assert from "node:assert/strict";
import { orderMilestones, dueLabel, sectionMeta, groupIssues, issueArgs } from "../github-panel/mods/github/milestones.js";

const NOW = Date.parse("2026-11-19T12:00:00Z");

test("orderMilestones_dueDateThenTitle", () => {
  const ordered = orderMilestones([
    { title: "Zed", due_on: null },
    { title: "Later", due_on: "2026-12-01T00:00:00Z" },
    { title: "Soon", due_on: "2026-11-20T00:00:00Z" },
    { title: "Alpha", due_on: null },
  ]);
  assert.deepEqual(ordered.map((m) => m.title), ["Soon", "Later", "Alpha", "Zed"]);
});

test("dueLabel_overdueTodayOrFuture", () => {
  assert.equal(dueLabel("2026-11-17T12:00:00Z", NOW), "2d overdue");
  assert.equal(dueLabel("2026-11-19T18:00:00Z", NOW), "due today");
  assert.equal(dueLabel("2026-11-25T12:00:00Z", NOW), "due 6d");
  assert.equal(dueLabel("", NOW), "");
  assert.equal(dueLabel("nope", NOW), "");
});

test("sectionMeta_joinsProgressAndDue", () => {
  assert.equal(sectionMeta({ open: 3, closed: 5, dueOn: "2026-11-25T12:00:00Z" }, NOW), "3 open · 5 closed · due 6d");
  assert.equal(sectionMeta({ open: 4, closed: 0, dueOn: "" }, NOW), "4 open");
});

test("groupIssues_ordersPlansAndLeavesInboxLast", () => {
  const issues = [
    { number: 1, milestone: { title: "Later" } },
    { number: 2, milestone: null },
    { number: 3, milestone: { title: "Soon" } },
    { number: 4, milestone: { title: "Soon" } },
  ];
  const milestones = [
    { number: 10, title: "Later", due_on: "2026-12-01T00:00:00Z", open_issues: 1, closed_issues: 2 },
    { number: 9, title: "Soon", due_on: "2026-11-20T00:00:00Z", open_issues: 2, closed_issues: 0 },
    { number: 8, title: "Empty", due_on: null, open_issues: 0, closed_issues: 4 },
  ];
  const sections = groupIssues(issues, milestones);
  assert.deepEqual(sections.map((s) => s.key), ["9", "10", "no-milestone"]);
  assert.deepEqual(sections[0].issues.map((i) => i.number), [3, 4]);
  assert.equal(sections[0].open, 2);
  assert.equal(sections[1].closed, 2);
  assert.equal(sections[2].title, "No milestone");
});

test("groupIssues_keepsUnknownMilestone", () => {
  const sections = groupIssues([{ number: 7, milestone: { title: "Old" } }], []);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].title, "Old");
  assert.equal(sections[0].open, 1);
});

test("issueArgs_milestoneAndInbox", () => {
  const inbox = issueArgs({ text: "guia", labels: new Set(["bug"]) }, { noMilestone: true });
  const search = inbox[inbox.indexOf("--search") + 1];
  assert.match(search, /^sort:created-desc no:milestone guia$/);
  assert.deepEqual(inbox.slice(inbox.indexOf("--label")), ["--label", "bug"]);
  const plan = issueArgs({ text: "", labels: new Set() }, { milestone: "Guia em fichas" });
  assert.equal(plan.at(-2), "--milestone");
  assert.equal(plan.at(-1), "Guia em fichas");
  assert.equal(plan.includes("no:milestone"), false);
});
