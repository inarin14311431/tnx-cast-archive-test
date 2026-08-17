import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-mobile-combos.js", import.meta.url), "utf8");

test("mobile combo enhancement uses an explicit idempotent initializer", () => {
  assert.match(source, /initializeMobileCombos\(\)/);
  assert.match(source, /root\.dataset\.mobileCombosInitialized === "1"/);
  assert.match(source, /root\.dataset\.mobileCombosInitialized = "1"/);
  assert.match(source, /get\("mobile"\) === "1"\) initializeMobileCombos\(\)/);
});

test("mobile combo enhancement preserves delayed render recovery and counter setup", () => {
  assert.match(source, /list\.dataset\.mobileComboEnhanced === "1"/);
  assert.match(source, /const combos = await getCombos\(\)/);
  assert.match(source, /initializeCounters\(list\)/);
  assert.match(source, /new MutationObserver/);
  assert.match(source, /window\.setTimeout\(\(\) => observer\.disconnect\(\), 6000\)/);
});
