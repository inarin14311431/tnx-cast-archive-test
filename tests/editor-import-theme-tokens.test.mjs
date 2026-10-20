import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const importCss = await readFile(new URL("../css-next/editor/import.css", import.meta.url), "utf8");
const rule = selector => {
  const start = importCss.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} rule not found`);
  return importCss.slice(start, importCss.indexOf("}", start));
};
const HARD_COLOR = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;

test("TSV sample box takes its background and text from theme tokens together", () => {
  const sample = rule(".tsv-import-guide__sample");
  assert.match(sample, /background: var\(--color-field\)/);
  assert.match(sample, /color: color-mix\(in srgb, var\(--color-accent\) 35%, var\(--color-text\)\)/);
  assert.doesNotMatch(sample, HARD_COLOR);
  assert.doesNotMatch(sample, /\b(?:white|black)\b(?!-)/);
});

test("master tooltip and legacy import progress follow the theme except for drop shadows", () => {
  for (const selector of ["#master-bs-tooltip {", "#master-bs-tooltip strong", "#master-bs-tooltip p", "#legacy-import-progress {", "#legacy-import-progress progress"]) {
    const body = rule(selector.replace(/ \{$/, ""));
    const withoutShadow = body.replace(/box-shadow:[^;]*;/g, "");
    assert.doesNotMatch(withoutShadow, HARD_COLOR, selector);
  }
  assert.match(rule("#master-bs-tooltip"), /color: var\(--color-text\)/);
});

test("modal backdrops use the shared overlay token", () => {
  assert.match(importCss, /#tsv-dialog::backdrop \{ background: var\(--color-overlay\)/);
  assert.match(importCss, /#legacy-import-dialog::backdrop \{\s*background: var\(--color-overlay\)/);
});

test("tooltip heading and border mix the warning color toward the text color so light themes keep contrast", () => {
  const tooltip = rule("#master-bs-tooltip");
  assert.match(tooltip, /border: 1px solid color-mix\(in srgb, var\(--color-warning\) 40%, var\(--color-text\)\)/);
  assert.match(rule("#master-bs-tooltip strong"), /color: color-mix\(in srgb, var\(--color-warning\) 40%, var\(--color-text\)\)/);
});
