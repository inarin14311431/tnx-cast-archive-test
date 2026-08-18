import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-mobile-outfit.js", import.meta.url), "utf8");

test("mobile outfit uses shared editor context instead of independent auth lookup", () => {
  assert.match(source, /getMobileEditorContext/);
  assert.doesNotMatch(source, /requireAuth/);
  assert.doesNotMatch(source, /from\(["']characters["']\)/);
});

test("mobile outfit keeps save coordinator contract", () => {
  assert.match(source, /tnx:mobile-before-save/);
  assert.match(source, /character_outfits/);
});

test("mobile outfit preserves category-dependent editor rules", () => {
  assert.match(source, /RANGE_OPTIONS/);
  assert.match(source, /SLOT_OPTIONS/);
  assert.match(source, /CONTROL_OPTIONS/);
  assert.match(source, /function categoryFields/);
  assert.match(source, /function parseConceal/);
  assert.match(source, /function parseDefense/);
});
