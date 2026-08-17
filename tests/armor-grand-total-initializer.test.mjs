import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/armor-grand-total.js", import.meta.url), "utf8");

test("armor total shim uses an explicit idempotent initializer", () => {
  assert.match(source, /function initializeArmorGrandTotal\(\)/);
  assert.match(source, /root\.dataset\.tnxArmorGrandTotalInitialized==='true'/);
  assert.match(source, /root\.dataset\.tnxArmorGrandTotalInitialized='true'/);
  assert.match(source, /initializeArmorGrandTotal\(\);/);
});

test("armor total shim preserves defense total synchronization hooks", () => {
  assert.match(source, /root\.addEventListener\('input'/);
  assert.match(source, /root\.addEventListener\('change'/);
  assert.match(source, /\[data-armor-defense\]/);
  assert.match(source, /\[data-armor-total=/);
  assert.match(source, /requestAnimationFrame\(updateAll\)/);
  assert.match(source, /setTimeout\(updateAll,300\)/);
});
