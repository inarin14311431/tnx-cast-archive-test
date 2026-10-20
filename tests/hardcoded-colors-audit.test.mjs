import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { collectColorCounts, countHardcodedColors, isTargetFile } from "../scripts/hardcoded-colors-lib.mjs";

const root = new URL("../", import.meta.url).pathname;

test("hex, rgb()/rgba() and hsl()/hsla() are counted", () => {
  const css = ".a { color: #fff; background: #00eaff80; border-color: rgb(1,2,3); box-shadow: 0 0 1px rgba(0,0,0,.5); outline-color: hsl(10 20% 30%); fill: HSLA(1,2%,3%,.4); stroke: #abcd; }";
  assert.equal(countHardcodedColors(css, "css"), 7);
});

test("var() fallbacks, custom property definitions and comments are not counted", () => {
  assert.equal(countHardcodedColors(".a { border: 1px solid var(--line, rgba(255,255,255,.16)); background: var(--s, #07131d); }", "css"), 0);
  assert.equal(countHardcodedColors(".a { color: var(--a, var(--b, #fff)); }", "css"), 0);
  assert.equal(countHardcodedColors(":root { --accent: #00eaff; --glow: 0 0 4px rgba(0,0,0,.3); }", "css"), 0);
  assert.equal(countHardcodedColors("/* #fff rgb(0,0,0) */ .a { color: red; /* #000 */ }", "css"), 0);
  assert.equal(countHardcodedColors("// #fff\nconst a = 1; /* rgba(0,0,0,1) */", "js"), 0);
  assert.equal(countHardcodedColors('el.style.setProperty("--x", "#fff"); el.style.cssText = "--y: #000; color: red";', "js"), 0);
});

test("a color next to a var() fallback is still counted", () => {
  assert.equal(countHardcodedColors(".a { color: #fff; border: 1px solid var(--line, #000); background: rgba(0,0,0,.5); }", "css"), 2);
  assert.equal(countHardcodedColors(".a { color: somevar(#fff); }", "css"), 1);
});

test("ids, entities and color-mix() are not mistaken for colors", () => {
  assert.equal(countHardcodedColors('document.querySelector("#add-general"); const s = "&#39;"; const u = "https://example.test/#cast-1";', "js"), 0);
  assert.equal(countHardcodedColors(".a { background: color-mix(in srgb, var(--color-accent) 40%, transparent); color: srgb(1 1 1); }", "css"), 0);
});

test("a color in JS code after a URL string is still counted", () => {
  assert.equal(countHardcodedColors('const u = "https://example.test/"; const c = "#ffffff";', "js"), 1);
});

test("scope: theme/foundation/token CSS, showcase files, vendor, style-colors and the fixed-design ticket are excluded", () => {
  for (const excluded of [
    "css-next/themes/presets.css", "css-next/foundation/base.css", "css-next/tokens/core.css",
    "css-next/pages/act-showcase.css", "js/showcase-output-css.js", "js/act-showcase-page.js", "js/vendor/x.js", "js/style-colors.js",
    "css-next/pages/experience-ticket.css", "js/experience-ticket.js"
  ]) assert.equal(isTargetFile(excluded), false, excluded);
  for (const included of ["css-next/pages/sheet-mobile.css", "css-next/components/help.css", "js/cast-sns-card.js", "js/udonarium-export.js"]) {
    assert.equal(isTargetFile(included), true, included);
  }
  assert.equal(isTargetFile("tests/foo.js"), false);
  assert.equal(isTargetFile("css-next/pages/readme.md"), false);
});

test("the baseline file is the sorted per-file count of the current tree", async () => {
  const baseline = JSON.parse(await readFile(new URL("../scripts/hardcoded-colors-baseline.json", import.meta.url), "utf8"));
  assert.equal(baseline.schema, 1);
  const files = Object.keys(baseline.files);
  assert.deepEqual(files, [...files].sort(), "baseline keys must be sorted");
  for (const [file, count] of Object.entries(baseline.files)) {
    assert.ok(isTargetFile(file), `${file} is outside the audited scope`);
    assert.ok(Number.isInteger(count) && count > 0, `${file} must have a positive integer count`);
  }
  const current = await collectColorCounts(root);
  for (const [file, count] of Object.entries(current)) {
    assert.ok(count <= (baseline.files[file] ?? 0), `${file} has ${count} hardcoded colors, baseline ${baseline.files[file] ?? 0}`);
  }
});
