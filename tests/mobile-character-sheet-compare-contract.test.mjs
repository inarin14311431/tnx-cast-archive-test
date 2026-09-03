import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const mobileSource = fs.readFileSync(new URL("../js/cast-mobile-level-labels.js", import.meta.url), "utf8");
const serviceSource = fs.readFileSync(new URL("../js/character-sheet-compare-service.js", import.meta.url), "utf8");
const mobileCss = fs.readFileSync(new URL("../css-next/pages/cast-mobile-readability.css", import.meta.url), "utf8");
const sheetMobileHtml = fs.readFileSync(new URL("../sheet-mobile.html", import.meta.url), "utf8");

test("mobile warehouse UI is owned by the existing profile enhancement lifecycle", () => {
  assert.match(mobileSource, /mobile-cast-source-heading-link/);
  assert.match(mobileSource, /data\.characterSheetLink = "1"/);
  assert.match(mobileSource, /mobile-cast-source-compare/);
  assert.match(mobileSource, /倉庫との差分を確認/);
  assert.match(mobileSource, /character-sheet-compare-service\.js\?v=1/);
  assert.doesNotMatch(mobileSource, /mobile-cast-source-link/);
  assert.doesNotMatch(mobileSource, /__tnxRefreshMobileCharacterSheetTools/);
});

test("mobile code delegates canonical comparison instead of duplicating normalization", () => {
  assert.doesNotMatch(mobileSource, /canonicalizeArchiveBundle/);
  assert.doesNotMatch(mobileSource, /canonicalizeCharacterSheetJsonp/);
  assert.doesNotMatch(mobileSource, /diffCanonicalBundles/);
  assert.match(serviceSource, /canonicalizeArchiveBundle/);
  assert.match(serviceSource, /canonicalizeCharacterSheetJsonp/);
  assert.match(serviceSource, /diffCanonicalBundles/);
});

test("source panel construction is idempotent across profile enhancement passes", () => {
  assert.match(mobileSource, /!section\.querySelector\("\.mobile-cast-source-panel"\)/);
  assert.match(mobileSource, /section\.dataset\.mobileProfileEnhanced = "1"/);
  assert.match(mobileSource, /section\?\.dataset\.mobileProfileEnhanced !== "1"/);
});

test("warehouse heading and compare controls have mobile styling", () => {
  assert.match(mobileCss, /\.mobile-cast-source-heading-link/);
  assert.match(mobileCss, /\.mobile-cast-source-compare/);
  assert.match(mobileCss, /\.mobile-character-sheet-compare-dialog/);
  assert.doesNotMatch(mobileCss, /\.mobile-cast-source-link/);
});

test("mobile editor is not coupled to public viewer comparison code", () => {
  assert.doesNotMatch(sheetMobileHtml, /cast-mobile-character-sheet-tools/);
  assert.doesNotMatch(sheetMobileHtml, /character-sheet-compare-service/);
});