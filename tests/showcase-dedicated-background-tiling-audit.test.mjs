import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

// This is the 3rd occurrence of the same bug pattern found in this codebase: a `background`
// shorthand declares one or more image layers (including var(--showcase-background), the actual
// ACT photo) but never states background-size/position/repeat, so those sub-properties reset to
// their initial values (auto/0 0/repeat) instead of inheriting anything, and the photo tiles.
// Previous occurrences: act-showcase-standard.css (standard page hero) and
// act-showcase-theme-surface-system.css's #act-showcase-standard-page rule (see
// showcase-standard-background-and-title-hierarchy.test.mjs). This time it's the deluxe
// (act-showcase.html) ACT TRAILER poster stage.

function ruleBodyFor(css, selector) {
  const start = css.indexOf(`${selector}{`);
  assert.notEqual(start, -1, `selector not found: ${selector}`);
  const openBrace = start + selector.length;
  return css.slice(openBrace + 1, css.indexOf("}", openBrace + 1));
}

test("deluxe ACT TRAILER stage (poster-v2-trailer-stage) theme override no longer tiles the ACT photo", async () => {
  const css = await read("css-next/pages/act-showcase-dedicated-themes.css");
  // This selector's `background` shorthand carries 2 decorative gradient layers plus
  // var(--showcase-background) (the photo) and used to omit size/position/repeat entirely,
  // which is exactly what caused the reported tiling on the final ACT TRAILER screen.
  const rule = ruleBodyFor(css, ":root[data-showcase-theme] body.showcase-poster-v2-ready .poster-v2-trailer-stage");
  assert.match(rule, /background-position:center/);
  assert.match(rule, /background-size:cover/);
  assert.match(rule, /background-repeat:no-repeat/);
});

test("deluxe ACT TRAILER stage base rule (act-showcase-final-trailer.css) states background-repeat explicitly", async () => {
  const css = await read("css-next/pages/act-showcase-final-trailer.css");
  const rule = ruleBodyFor(css, "body.showcase-poster-v2-ready .poster-v2-trailer-stage");
  assert.match(rule, /background-position:center/);
  assert.match(rule, /background-size:cover/);
  assert.match(rule, /background-repeat:no-repeat/);
});

test("deluxe ambient stage theme override (act-showcase-dedicated-themes.css) no longer relies on implicit background-size/repeat", async () => {
  const css = await read("css-next/pages/act-showcase-dedicated-themes.css");
  const rule = ruleBodyFor(css, ":root[data-showcase-theme] body.has-showcase-background .ambient-stage:before");
  assert.match(rule, /background-position:center/);
  assert.match(rule, /background-size:cover/);
  assert.match(rule, /background-repeat:no-repeat/);
});

test("deluxe poster board theme override (act-showcase-ornament.css) no longer relies on implicit background-size/repeat", async () => {
  const css = await read("css-next/pages/act-showcase-ornament.css");
  const rule = ruleBodyFor(css, "body.showcase-poster-v2-ready .poster-v2-board:before");
  assert.match(rule, /background-position:center top/);
  assert.match(rule, /background-size:cover/);
  assert.match(rule, /background-repeat:no-repeat/);
});

test("deluxe opening hero theme overrides (act-showcase-theme-legibility.css) keep the codebase's cover,contain photo convention explicit", async () => {
  const css = await read("css-next/pages/act-showcase-theme-legibility.css");
  const base = ruleBodyFor(css, ":root[data-showcase-theme] body#act-showcase-page.showcase-poster-v2-ready .scene-opening:before");
  assert.match(base, /background-size:cover,contain/);
  assert.match(base, /background-repeat:no-repeat,no-repeat/);

  const intron = ruleBodyFor(css, ':root[data-showcase-theme="intron"] body#act-showcase-page.showcase-poster-v2-ready .scene-opening:before');
  assert.match(intron, /background-size:cover,contain/);
  assert.match(intron, /background-repeat:no-repeat,no-repeat/);
});

test("deluxe opening hero + poster board theme overrides (act-showcase-theme-surface-system.css) keep the codebase's cover,contain photo convention explicit", async () => {
  const css = await read("css-next/pages/act-showcase-theme-surface-system.css");
  const opening = ruleBodyFor(css, ":root[data-showcase-theme] body.showcase-poster-v2-ready .scene-opening:before");
  assert.match(opening, /background-size:cover,contain/);
  assert.match(opening, /background-repeat:no-repeat,no-repeat/);

  const board = ruleBodyFor(css, ":root[data-showcase-theme] body.showcase-poster-v2-ready .poster-v2-board:before");
  assert.match(board, /background-position:center top,center top/);
  assert.match(board, /background-size:cover,contain/);
  assert.match(board, /background-repeat:no-repeat,no-repeat/);
});

test("deluxe opening hero visual-emphasis overrides (act-showcase-visual-emphasis.css) state background-size/repeat explicitly", async () => {
  const css = await read("css-next/pages/act-showcase-visual-emphasis.css");
  const base = ruleBodyFor(css, ":root[data-showcase-theme] body#act-showcase-page.showcase-poster-v2-ready.has-showcase-background .scene-opening:before");
  assert.match(base, /background-size:cover,contain/);
  assert.match(base, /background-repeat:no-repeat,no-repeat/);

  const intron = ruleBodyFor(css, ':root[data-showcase-theme="intron"] body#act-showcase-page.showcase-poster-v2-ready.has-showcase-background .scene-opening:before');
  assert.match(intron, /background-position:center,right center/);
  assert.match(intron, /background-size:cover,contain/);
  assert.match(intron, /background-repeat:no-repeat,no-repeat/);
});

test("deluxe opening hero mobile override (act-showcase-cinematic-v2.css) is self-contained for background-repeat", async () => {
  const css = await read("css-next/pages/act-showcase-cinematic-v2.css");
  const mediaBlock = css.slice(css.indexOf("@media (max-width:760px)"));
  const rule = ruleBodyFor(mediaBlock, "body.showcase-poster-v2-ready.showcase-published-background-restored .scene-opening:before");
  assert.match(rule, /background-size:cover,contain/);
  assert.match(rule, /background-repeat:no-repeat,no-repeat/);
});
