import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("ability values toggle script flips a global body class without persistence", async () => {
  const script = await read("js/ability-values-toggle.js");
  assert.match(script, /data-ability-values-toggle/);
  assert.match(script, /classList\.toggle\(\s*"is-ability-values-visible"/);
  assert.match(script, /aria-pressed/);
  assert.doesNotMatch(script, /localStorage/);
});

test("sheet.html and cast.html each expose one ability values toggle button wired to the shared script", async () => {
  const [sheet, cast] = await Promise.all([read("sheet.html"), read("cast.html")]);

  for (const html of [sheet, cast]) {
    const matches = [...html.matchAll(/data-ability-values-toggle/g)];
    assert.equal(matches.length, 1);
    assert.match(html, /ability-values-toggle\.js\?v=\d+/);
  }
});

test("ability-value-tooltip.css hides inline values by default and reveals them under the global toggle", async () => {
  const css = await read("css-next/components/ability-value-tooltip.css");
  assert.match(css, /\.ability-value-inline\s*\{[^}]*display:\s*none;/);
  assert.match(css, /body\.is-ability-values-visible \.ability-value-inline\s*\{[^}]*display:\s*block;/);
});
