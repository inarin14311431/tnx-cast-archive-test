import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const details = await readFile(new URL("../css-next/pages/cast-view-details.css", import.meta.url), "utf8");
const entry = await readFile(new URL("../css-next/pages/cast-entry.css", import.meta.url), "utf8");
const castHtml = await readFile(new URL("../cast.html", import.meta.url), "utf8");

test("desktop character sheet warehouse link is pinned to the fourth identity column", () => {
  assert.match(details, /@media\(min-width:1200px\)\{[\s\S]*\.identity-grid > \.cast-character-sheet-link\{[\s\S]*grid-column:4;/);
});

test("mobile layout is not forced into the desktop fourth column", () => {
  assert.doesNotMatch(details, /@media\(max-width:[^)]+\)[\s\S]*\.identity-grid > \.cast-character-sheet-link[\s\S]*grid-column:4/);
});

test("cast viewer cache generations include the placement update", () => {
  assert.match(entry, /cast-view-details\.css\?v=5/);
  assert.match(castHtml, /cast-entry\.css\?v=7/);
});
