import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tables = await readFile(new URL("../js/outfit-tables.js", import.meta.url), "utf8");
const armorShim = await readFile(new URL("../js/armor-grand-total.js", import.meta.url), "utf8");
const multiline = await readFile(new URL("../js/sheet-multiline-fields-v3.js", import.meta.url), "utf8");
const autofill = await readFile(new URL("../js/sheet-master-autofill.js", import.meta.url), "utf8");
const features = await readFile(new URL("../js/sheet-features.js", import.meta.url), "utf8");

test("outfit tables solely own armor defense totals", () => {
  assert.match(tables, /function updateArmorTotals\(section\)/);
  assert.match(tables, /data-armor-total/);
  assert.doesNotMatch(armorShim, /#outfit-list|MutationObserver|data-armor-defense|data-armor-total/);
});

test("current outfit root responsibilities remain distinct", () => {
  assert.match(tables, /document\.querySelector\('#outfit-list'\)/);
  assert.match(multiline, /const outfitRoot=document\.querySelector\("#outfit-list"\)/);
  assert.match(multiline, /new MutationObserver\(queue\)\.observe\(outfitRoot/);
  assert.match(autofill, /document\.querySelectorAll\("#outfit-list \[data-outfit-key\]"\)/);
  assert.doesNotMatch(autofill, /MutationObserver/);
  assert.doesNotMatch(features, /#outfit-list/);
});

test("multiline observer is the next explicit outfit listener migration boundary", () => {
  assert.match(multiline, /outfitRoot&&new MutationObserver\(queue\)/);
  assert.match(multiline, /window\.TNXMultilineFields=\{enhance,queue,normalize,setStyleNameExact\}/);
});
