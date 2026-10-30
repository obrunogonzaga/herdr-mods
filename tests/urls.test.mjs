import { test } from "node:test";
import assert from "node:assert/strict";
import { safeUrl } from "../github-panel/mods/github/urls.js";

test("safeUrl_httpsLink_returnsIt", () => {
  assert.equal(safeUrl("https://github.com/o/r/actions/runs/1/job/2"), "https://github.com/o/r/actions/runs/1/job/2");
});

test("safeUrl_otherSchemesOrJunk_returnsNull", () => {
  for (const url of ["file:///Applications/Calculator.app", "http://ci.example.com/1", "x-apple.systempreferences:", "-a Calculator", "", null, undefined]) {
    assert.equal(safeUrl(url), null, String(url));
  }
});
