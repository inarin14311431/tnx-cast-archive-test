import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile cast labels initialize from the mobile render event", () => {
  const source = read("js/cast-mobile-level-labels.js");
  assert.match(source, /tnx:mobile-cast-rendered/);
  assert.match(source, /applyAfterMobileRender/);
  assert.match(source, /once: true/);
  assert.doesNotMatch(source, /new MutationObserver/);
  assert.doesNotMatch(source, /\.observe\(/);
});

test("mobile cast labels keep idempotent profile and label guards", () => {
  const source = read("js/cast-mobile-level-labels.js");
  assert.match(source, /mobileLevelLabel/);
  assert.match(source, /mobileBilingualLabel/);
  assert.match(source, /mobileProfileAligned/);
  assert.match(source, /mobileProfileEnhanced/);
});
