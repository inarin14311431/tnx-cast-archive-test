import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = name => readFile(new URL(`../css-next/pages/${name}`, import.meta.url), "utf8");
const [castCss, mobileCss, combosCss] = await Promise.all(["cast.css", "cast-mobile.css", "cast-mobile-combos.css"].map(read));
const HARD_COLOR = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;
const rule = selector => {
  const start = castCss.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} rule not found`);
  return castCss.slice(start, castCss.indexOf("}", start));
};
// Same exemption as audit:colors: the fallback inside var(--x, <color>) is not a hardcoded color.
const withoutFallbacks = css => css.replace(/var\(--[\w-]+,\s*#[0-9a-f]{3,8}\)/gi, "var(--x)");

test("mobile cast view CSS has no hardcoded colors", () => {
  assert.doesNotMatch(withoutFallbacks(mobileCss), HARD_COLOR);
  assert.doesNotMatch(withoutFallbacks(combosCss), HARD_COLOR);
});

test("mobile cast view cell tints and rules follow the text color instead of fixed white", () => {
  assert.match(mobileCss, /\.mobile-skill-row\{[^}]*background:color-mix\(in srgb,var\(--color-text\) 3%,transparent\)/);
  assert.match(mobileCss, /\.mobile-cast-summary\{[^}]*border-top:1px dashed color-mix\(in srgb,var\(--color-text\) 10%,transparent\)/);
  assert.doesNotMatch(mobileCss + combosCss, /rgb\(255 255 255\//);
});

test("mobile combo counter mixes the success color toward the text color so pale success colors stay readable", () => {
  const used = combosCss.match(/\.mobile-combo-counter__box\.is-used\{([^}]*)\}/)?.[1] ?? "";
  assert.match(used, /color:color-mix\(in srgb,var\(--color-success\) 45%,var\(--color-text\)\)/);
  assert.doesNotMatch(combosCss, /#66d28b|#9ecbab|#86d9a1|#8ebfa0/i);
});

test("hero image label overlay and session panel header tints come from theme tokens", () => {
  const label = rule(".cast-hero__image-label");
  assert.match(label, /color: var\(--color-accent\)/);
  assert.match(label, /background: color-mix\(in srgb, var\(--color-bg\) 72%, transparent\)/);
  assert.doesNotMatch(label, HARD_COLOR);
  assert.match(rule("#tab-session .panel-ability > .data-panel__header"), /var\(--color-section-ability\) 22%/);
  assert.match(rule("#tab-session .panel-skills > .data-panel__header"), /var\(--color-section-skills\) 22%/);
});

test("colors deliberately left in cast.css are shadows, the combos gold, the pressed toggle, the page-dark mix and print white", () => {
  const allowed = [/box-shadow/, /#tab-session \.panel-combos/, /style-description-toggle-all\[aria-pressed="true"\]/, /\.quick-sheet \{/, /@media print/, /is-quick-sheet-open/];
  for (const line of castCss.split("\n")) {
    if (!HARD_COLOR.test(line.replace(/var\(--[\w-]+,\s*#[0-9a-f]{3,8}\)/gi, ""))) continue;
    assert.ok(allowed.some(pattern => pattern.test(line)), `unexpected hardcoded color: ${line.trim().slice(0, 100)}`);
  }
});
