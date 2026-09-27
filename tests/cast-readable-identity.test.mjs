import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css = readFileSync(new URL("../css-next/pages/cast-desktop-layout.css", import.meta.url), "utf8");
test("readable desktop identity keeps ruby paired and separate gameplay rows", () => {
  assert.match(css, /#cast-handle-kana \{ grid-column: 1; grid-row: 1;/);
  assert.match(css, /#cast-kana \{ grid-column: 2; grid-row: 1;/);
  assert.match(css, /#cast-handle \{ grid-column: 1; grid-row: 2;/);
  assert.match(css, /#cast-name \{ grid-column: 2; grid-row: 2;/);
  assert.match(css, /#cast-summary-panel \{ order: -2;/);
  assert.match(css, /divine-card__yomi \{[^}]*font-size: 14px;/);
  assert.match(css, /identity-grid dt \{[^}]*font-size: 14px;/);
  assert.match(css, /cast-style-card-simple::after,[\s\S]*display: none;/);
  assert.match(css, /#cast-styles.cast-style-grid-simple, .cast-divine-authority .hero-divine-list/);
});
