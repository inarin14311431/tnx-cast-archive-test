import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile cast removes the legacy duplicate link and turns the profile title into the source link", async () => {
  const source = await read("js/cast-mobile-character-sheet-tools.js");
  assert.match(source, /mobile-cast-character-sheet-link/);
  assert.match(source, /data-character-sheet-link='1'/);
  assert.match(source, /mobile-cast-source-heading-link/);
  assert.match(source, /strong\.textContent = "キャラクターシート倉庫"/);
  assert.match(source, /panel\.querySelector\("\.mobile-cast-source-link"\)\?\.remove\(\)/);
});

test("mobile cast can compare the current archive bundle against Character Sheets JSONP", async () => {
  const source = await read("js/cast-mobile-character-sheet-tools.js");
  assert.match(source, /canonicalizeArchiveBundle/);
  assert.match(source, /canonicalizeCharacterSheetJsonp/);
  assert.match(source, /diffCanonicalBundles/);
  assert.match(source, /summarizeCharacterSheetDifferences/);
  assert.match(source, /倉庫との差分を確認/);
});

test("legacy life path values with acquired skills are split in mobile view and editor", async () => {
  const viewer = await read("js/cast-mobile-character-sheet-tools.js");
  const editor = await read("js/sheet-mobile-lifepath-normalizer.js");
  const app = await read("js/sheet-mobile-app.js");
  assert.match(viewer, /\[＜<\]/);
  assert.match(viewer, /mobile-cast-lifepath-skill/);
  assert.match(editor, /\[＜<\]/);
  assert.match(editor, /\$\{detail\.name\}（\$\{detail\.skill\}）/);
  assert.match(app, /sheet-mobile-lifepath-normalizer\.js\?v=1/);
});

test("mobile Character Sheets presentation styles are loaded by the cast entry stylesheet", async () => {
  const entry = await read("css-next/pages/cast-entry.css");
  const css = await read("css-next/pages/cast-mobile-character-sheet-tools.css");
  assert.match(entry, /cast-mobile-character-sheet-tools\.css\?v=1/);
  assert.match(css, /\.mobile-cast-source-heading-link/);
  assert.match(css, /\.mobile-character-sheet-compare-dialog/);
});
