import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../css-next/pages/cast.css", import.meta.url), "utf8");

// A selector can appear in more than one rule (a shared "position / shape" rule and its own declarations), so this
// returns the declarations of every rule that ends in the selector.
function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...css.matchAll(new RegExp(`^${escaped}\\s*\\{([^}]*)\\}`, "gm"))];
  assert.ok(matches.length, `${selector} rule not found`);
  return matches.map(match => match[1]).join(" ");
}

// ◎ on the view page is two CSS rings. The inner one used top/left 50% + translate(-50%, -50%) on an 8px box inside a
// 17px glyph, which lands on half a pixel (8.5 - 4), and a 3px border left a 2px hole: the mark read as an eye, not as
// two concentric circles. Both rings now use the same 2px weight and the inner ring is placed with inset.
test("the persona mark's rings are concentric: same weight, inner ring placed with inset", () => {
  const outer = rule(".cast-style-slot .style-mark-glyph--persona::before");
  const inner = rule(".cast-style-slot .style-mark-glyph--persona::after");
  assert.match(outer, /border:\s*2px solid currentColor/);
  assert.match(inner, /border:\s*2px solid currentColor/);
  assert.match(inner, /inset:\s*4px/);
  assert.doesNotMatch(inner, /translate/);
  assert.doesNotMatch(inner, /(^|[\s;])(top|left):/);
});

test("the gap between the rings equals the ring weight on a 17px glyph", () => {
  const glyph = 17;
  const border = 2;
  const inset = 4;
  assert.match(css, new RegExp(`style-mark-glyph \\{[^}]*width: ${glyph}px`));
  const gap = inset - border; // outer ring's inside edge is at `border`, the inner ring starts at `inset`
  assert.equal(gap, border);
});

test("the key mark stays a solid disc and the glyph size is unchanged", () => {
  assert.match(rule(".cast-style-slot .style-mark-glyph--key::before"), /background:\s*currentColor/);
  assert.match(rule(".cast-style-slot .style-mark-glyph"), /width:\s*17px[^}]*height:\s*17px/);
});
