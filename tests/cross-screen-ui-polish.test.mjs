import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("screen entry styles load isolated polish layers", () => {
  const contracts = [
    ["css-next/pages/sheet-mobile-entry.css", "sheet-mobile-polish.css?v=1"],
    ["css-next/pages/showcase-entry.css", "showcase-ux-polish.css?v=1"],
    ["css-next/pages/troop-entry.css", "troop-actions-polish.css?v=1"],
    ["css-next/pages/archive-entry.css", "archive-ux-polish.css?v=1"],
    ["css-next/pages/acts-entry.css", "acts-metrics-polish.css?v=1"],
    ["css-next/pages/troops-entry.css", "troops-responsive-polish.css?v=1"],
  ];
  for (const [path, expected] of contracts) {
    assert.match(read(path), new RegExp(expected.replace(/[.?]/g, "\\$&")));
  }
});

test("mobile editor removes prototype wording and uses semantic state colors", () => {
  const css = read("css-next/pages/sheet-mobile-polish.css");
  assert.match(css, /CAST SHEET MOBILE EDITOR/);
  assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /var\(--color-warning/);
  assert.match(css, /var\(--color-success/);
  assert.doesNotMatch(css, /PROTOTYPE/);
});

test("showcase operations use theme tokens with a primary publish action", () => {
  const css = read("css-next/pages/showcase-ux-polish.css");
  assert.match(css, /--showcase-cyan: var\(--color-accent\)/);
  assert.match(css, /#publish-button:not\(:disabled\)/);
  assert.match(css, /#download-button, #copy-button/);
});

test("troop editor actions stay available and registry rows reflow before mobile", () => {
  const editor = read("css-next/pages/troop-actions-polish.css");
  const registry = read("css-next/pages/troops-responsive-polish.css");
  assert.match(editor, /position: sticky/);
  assert.match(editor, /button\[type="submit"\]/);
  assert.match(registry, /min-width: 761px/);
  assert.match(registry, /max-width: 1050px/);
  assert.match(registry, /grid-column: 1 \/ -1/);
});

test("archive and act history expose the intended visual hierarchy", () => {
  const archive = read("css-next/pages/archive-ux-polish.css");
  const acts = read("css-next/pages/acts-metrics-polish.css");
  assert.match(archive, /archive-control--search input/);
  assert.match(archive, /height: 232px/);
  assert.match(acts, /article:nth-child\(4\)/);
  assert.match(acts, /font-size: 2\.45rem/);
});

test("legacy combo route redirects cast-specific requests and no longer runs the old editor", () => {
  const html = read("combos.html");
  assert.match(html, /sheet\.html\?id=\$\{encodeURIComponent\(id\)\}#combos/);
  assert.match(html, /キャストシートへ統合済み/);
  assert.match(html, /キャスト管理へ移動/);
  assert.doesNotMatch(html, /js\/combos\.js/);
  assert.doesNotMatch(html, /id="combo-form"/);
});
