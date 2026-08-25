import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [sheet, masterApply, tsv] = await Promise.all([
  read("js/sheet.js"),
  read("js/outfit-ofc-master-apply.js"),
  read("js/outfit-ofc-tsv.js")
]);

test("classic editor exposes one direct outfit-model import gateway", () => {
  assert.match(sheet, /function applyOutfitDetailsForImport\(key, details = \{\}\)/);
  assert.match(sheet, /normalizeImportedOutfitDetails\(category, details\)/);
  assert.match(sheet, /outfit\._ofc_details = \{/);
  assert.match(sheet, /applyOutfitDetailsForImport\s*\n?\s*\}/);
  assert.doesNotMatch(sheet, /TNXOutfitOFCState/);
});

test("OFC master enrichment updates the editor model instead of mutating inputs", () => {
  assert.match(masterApply, /TNXSheetEditor\?\.applyOutfitDetailsForImport/);
  assert.doesNotMatch(masterApply, /data-ofc/);
  assert.doesNotMatch(masterApply, /\.dispatchEvent\(new Event\(["']input/);
  assert.doesNotMatch(masterApply, /\.dispatchEvent\(new Event\(["']change/);
  assert.doesNotMatch(masterApply, /waitForOfcFields/);
});

test("OFC TSV enrichment updates the editor model instead of mutating inputs", () => {
  assert.match(tsv, /TNXSheetEditor\?\.applyOutfitDetailsForImport/);
  assert.doesNotMatch(tsv, /data-ofc/);
  assert.doesNotMatch(tsv, /\.dispatchEvent\(new Event\(["']input/);
  assert.doesNotMatch(tsv, /\.dispatchEvent\(new Event\(["']change/);
  assert.doesNotMatch(tsv, /cssEscape/);
});
