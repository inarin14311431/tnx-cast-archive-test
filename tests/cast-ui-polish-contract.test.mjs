import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../css-next/pages/cast-ui-polish.css", import.meta.url), "utf8");
const entry = await readFile(new URL("../css-next/pages/cast-entry.css", import.meta.url), "utf8");

test("desktop cast polish is isolated in the final cascade layer", () => {
  assert.match(entry, /cast-transfer, cast-troop-modal, cast-polish;/);
  assert.match(entry, /@import url\("\.\/cast-ui-polish\.css\?v=1"\) layer\(cast-polish\);/);
  assert.match(css, /@media \(min-width: 1200px\)/);
  assert.doesNotMatch(css, /@media\s*\([^)]*max-width/i);
});

test("desktop cast polish covers the four review targets", () => {
  assert.match(css, /\.cast-header__actions #cast-edit-button/);
  assert.match(css, /:is\(\.cast-quick-sheet-link, \.cast-view-mode-link, \.cast-troops-jump\)/);
  assert.match(css, /\.identity-grid > div:not\(\.cast-character-sheet-link\)/);
  assert.match(css, /\.identity-grid > \.cast-character-sheet-link[\s\S]*grid-column: 4;[\s\S]*grid-row: 2;/);
  assert.match(css, /\.cast-hero[\s\S]*grid-template-columns: minmax\(280px, 360px\) minmax\(0, 1fr\);/);
  assert.match(css, /\.cast-hero__image-panel[\s\S]*height: auto;/);
  assert.match(css, /\.cast-hero__image-frame[\s\S]*aspect-ratio: 3 \/ 4;/);
});
