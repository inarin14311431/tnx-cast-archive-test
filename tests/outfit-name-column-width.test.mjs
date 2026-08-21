import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../css-next/editor/outfits.css", import.meta.url), "utf8");
const index = await readFile(new URL("../css-next/index.css", import.meta.url), "utf8");

test("all outfit categories share one fixed name column width", () => {
  assert.match(css, /--outfit-name-column:\s*150px/);
  assert.match(css, /outfit-table-head--name, \.outfit-table-cell--name\) \{ width: var\(--outfit-name-column\); min-width: var\(--outfit-name-column\); max-width: var\(--outfit-name-column\); \}/);
  assert.doesNotMatch(css, /outfit-table-group--armor[^\n]*outfit-table-head--name/);
});

test("armor does not force a category-specific description width", () => {
  assert.doesNotMatch(css, /outfit-table-group--armor[\s\S]{0,160}outfit-table-head--description/);
  assert.match(css, /outfit-table-head--description, \.outfit-table-cell--description\) \{ width: auto;/);
  assert.match(index, /editor\/outfits\.css\?v=14/);
});
