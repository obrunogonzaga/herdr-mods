// A PR's statusCheckRollup (check runs and commit statuses) as one state.

const PASSED = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);
const WAITING = new Set(["PENDING", "EXPECTED"]);

function checkState(check) {
  if (check.__typename === "StatusContext") {
    if (check.state === "SUCCESS") return "pass";
    return WAITING.has(check.state) ? "pending" : "fail";
  }
  if (check.status !== "COMPLETED") return "pending";
  return PASSED.has(check.conclusion) ? "pass" : "fail";
}

// { state, total, passed, pending, failed, checks: [{ name, url, state }] }.
// A failure wins over checks still running: it already needs you.
export function summarizeChecks(rollup = []) {
  const checks = (rollup ?? []).map((check) => ({
    name: check.name ?? check.context,
    url: check.detailsUrl ?? check.targetUrl,
    state: checkState(check),
  }));
  const count = (state) => checks.filter((check) => check.state === state).length;
  const failed = checks.filter((check) => check.state === "fail");
  const state = !checks.length ? "none" : failed.length ? "fail" : count("pending") ? "pending" : "pass";
  return { state, total: checks.length, passed: count("pass"), pending: count("pending"), failed, checks };
}

export function checksSummaryText(summary) {
  if (summary.state === "fail") return `CI ✗ ${summary.failed.length} failed`;
  if (summary.state === "pending") return `CI ${summary.passed}/${summary.total}`;
  if (summary.state === "pass") return "CI ✓ passed";
  return "CI · no checks";
}

// "fail" or "pass" when a PR we saw running has finished; null otherwise (a new PR, still running,
// or already done the first time we looked, so starting Herdr raises no toasts).
export function finishedState(before, after) {
  if (!before || !after || before.number !== after.number || before.checks.state !== "pending") return null;
  return ["fail", "pass"].includes(after.checks.state) ? after.checks.state : null;
}

export function checksIcon(state, t) {
  if (state === "pass") return { text: "✓", color: t.ansi2 };
  if (state === "fail") return { text: "✗", color: t.ansi1 };
  if (state === "pending") return { text: "●", color: t.working };
  return null;
}
