import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeChecks, finishedState } from "../github-panel/mods/github/checks.js";

const run = (status, conclusion, name = "x") => ({ __typename: "CheckRun", status, conclusion, name, detailsUrl: `u/${name}` });
const ctx = (state, context = "s") => ({ __typename: "StatusContext", state, context, targetUrl: `t/${context}` });
const pr = (number, rollup) => ({ number, checks: summarizeChecks(rollup) });

test("summarizeChecks_noChecks_returnsNone", () => {
  assert.equal(summarizeChecks([]).state, "none");
});

test("summarizeChecks_allSucceededOrSkipped_returnsPass", () => {
  assert.equal(summarizeChecks([run("COMPLETED", "SUCCESS"), run("COMPLETED", "SKIPPED"), ctx("SUCCESS")]).state, "pass");
});

test("summarizeChecks_someRunning_returnsPendingWithCounts", () => {
  const summary = summarizeChecks([run("IN_PROGRESS", null), run("COMPLETED", "SUCCESS"), ctx("PENDING")]);
  assert.equal(summary.state, "pending");
  assert.equal(summary.passed, 1);
  assert.equal(summary.pending, 2);
});

test("summarizeChecks_failureWhileOthersRun_returnsFailWithUrls", () => {
  const summary = summarizeChecks([run("IN_PROGRESS", null), run("COMPLETED", "FAILURE", "lint"), ctx("ERROR", "deploy")]);
  assert.equal(summary.state, "fail");
  assert.deepEqual(summary.failed.map((c) => [c.name, c.url]), [["lint", "u/lint"], ["deploy", "t/deploy"]]);
});

test("summarizeChecks_timedOut_returnsFail", () => {
  assert.equal(summarizeChecks([run("COMPLETED", "TIMED_OUT")]).state, "fail");
});

test("finishedState_watchedRunThatFinished_returnsItsResult", () => {
  const pending = pr(7, [run("IN_PROGRESS", null)]);
  assert.equal(finishedState(pending, pr(7, [run("COMPLETED", "SUCCESS")])), "pass");
  assert.equal(finishedState(pending, pr(7, [run("COMPLETED", "FAILURE")])), "fail");
});

test("finishedState_notAWatchedFinish_returnsNull", () => {
  const pending = pr(7, [run("IN_PROGRESS", null)]), passed = pr(7, [run("COMPLETED", "SUCCESS")]), failed = pr(7, [run("COMPLETED", "FAILURE")]);
  assert.equal(finishedState(undefined, failed), null);
  assert.equal(finishedState(passed, failed), null);
  assert.equal(finishedState(pending, pending), null);
  assert.equal(finishedState(pending, pr(8, [run("COMPLETED", "FAILURE")])), null);
  assert.equal(finishedState(pending, null), null);
});
