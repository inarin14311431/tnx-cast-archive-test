import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

const castCss = await readFile(new URL("../css-next/pages/cast.css", import.meta.url), "utf8");
const tableCss = await readFile(new URL("../css-next/pages/cast-style-skill-table.css", import.meta.url), "utf8");
const entry = await readFile(new URL("../css-next/pages/cast-entry.css", import.meta.url), "utf8");

// Container width at a 1200px viewport is 1138px; the table must not be wider than that by default.
test("style skill table follows the frame width and 解説 takes the remaining space", () => {
  const rule = castCss.match(/\.style-skill-view-table \{([^}]*)\}/)[1];
  assert.match(rule, /\bwidth:\s*100%/);
  const min = Number(rule.match(/min-width:\s*(\d+)px/)[1]);
  assert.ok(min <= 1138, `min-width ${min}px must fit a 1200px viewport`);
  assert.doesNotMatch(rule, /max-width/);
  assert.match(castCss, /col\.style-col-description \{ width: auto; \}/);
});

test("the last column's resize handle stays inside the table", () => {
  assert.match(tableCss, /\.style-skill-view-table th:last-child > \.style-col-resizer \{ right: 0; \}/);
  assertVersionedMatch(entry, /cast-style-skill-table\.css\?v=VERSION/);
});

// Only the last tab's right border separates the tab list from the COMBO jump button.
test("COMBO jump button adds no divider of its own", () => {
  assert.doesNotMatch(castCss, /\.cast-combo-jump::before/);
  const rule = castCss.match(/^\.cast-combo-jump \{([^}]*)\}/m)[1];
  assert.doesNotMatch(rule, /border-left/);
});
