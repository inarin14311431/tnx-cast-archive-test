import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-view-controls.js", import.meta.url), "utf8");

test("cast summary control uses an explicit idempotent initializer", () => {
  assert.match(source, /function initializeCastSummaryControl\(\)/);
  assert.match(source, /panel\.dataset\.summaryControlInitialized === "1"/);
  assert.match(source, /panel\.dataset\.summaryControlInitialized = "1"/);
  assert.match(source, /initializeCastSummaryControl\(\);/);
});

test("cast summary control preserves expansion and measurement hooks", () => {
  assert.match(source, /toggle\.addEventListener\("click"/);
  assert.match(source, /tnx:cast-rendered/);
  assert.match(source, /applyAfterCastRender/);
  assert.match(source, /once: true/);
  assert.doesNotMatch(source, /new MutationObserver/);
  assert.doesNotMatch(source, /observe\(summary/);
  assert.match(source, /window\.addEventListener\("resize", scheduleMeasure, \{ passive: true \}\)/);
  assert.match(source, /toggle\.hidden = summary\.scrollHeight <= summary\.clientHeight \+ 1/);
});
