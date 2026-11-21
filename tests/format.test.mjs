import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewText, mergeText, diffText, assigneeLogins } from "../github-panel/mods/github/format.js";

test("reviewText_draftApprovedChangesOrReview", () => {
  assert.equal(reviewText({ isDraft: true, reviewDecision: "APPROVED" }), "draft");
  assert.equal(reviewText({ reviewDecision: "APPROVED" }), "approved");
  assert.equal(reviewText({ reviewDecision: "CHANGES_REQUESTED" }), "changes");
  assert.equal(reviewText({}), "review");
});

test("mergeText_knownStatus_returnsWord", () => {
  assert.equal(mergeText("CLEAN"), "clean");
  assert.equal(mergeText("BEHIND"), "behind");
  assert.equal(mergeText("HAS_HOOKS"), "hooks");
  assert.equal(mergeText("NOPE"), null);
  assert.equal(mergeText(undefined), null);
});

test("diffText_countsFiles", () => {
  assert.deepEqual(diffText({ additions: 3, deletions: 1, changedFiles: 1 }), {
    additions: 3, deletions: 1, files: 1, noun: "file",
  });
  assert.equal(diffText({}).noun, "files");
  assert.equal(diffText({}).additions, 0);
});

test("assigneeLogins_ignoresBlanks", () => {
  assert.deepEqual(assigneeLogins({ assignees: [{ login: "ada" }, {}, { login: "grace" }] }), ["ada", "grace"]);
  assert.deepEqual(assigneeLogins({}), []);
});
