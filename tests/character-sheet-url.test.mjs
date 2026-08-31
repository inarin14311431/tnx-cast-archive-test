import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCharacterSheetUrl, isValidCharacterSheetUrl } from "../js/character-sheet-url.js";

test("accepts canonical TNX edit URLs", () => {
  const input = "https://character-sheets.appspot.com/tnx/edit.html?key=abc_123-XYZ";
  assert.equal(normalizeCharacterSheetUrl(input), input);
  assert.equal(isValidCharacterSheetUrl(input), true);
});

test("keeps blank values optional", () => {
  assert.equal(normalizeCharacterSheetUrl(""), "");
  assert.equal(isValidCharacterSheetUrl(""), true);
});

test("rejects other hosts, paths, protocols and missing keys", () => {
  for (const input of [
    "https://example.com/tnx/edit.html?key=abc",
    "https://character-sheets.appspot.com/coc/edit.html?key=abc",
    "http://character-sheets.appspot.com/tnx/edit.html?key=abc",
    "https://character-sheets.appspot.com/tnx/edit.html",
    "https://character-sheets.appspot.com/tnx/edit.html?key=bad%20key"
  ]) {
    assert.equal(normalizeCharacterSheetUrl(input), null, input);
    assert.equal(isValidCharacterSheetUrl(input), false, input);
  }
});
