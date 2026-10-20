import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile editor save-state borders use the theme status tokens", async () => {
  const css = await read("css-next/pages/sheet-mobile.css");
  for (const [state, token] of [["error", "--color-danger"], ["dirty", "--color-warning"], ["saved", "--color-success"]]) {
    assert.match(css, new RegExp(`\\.mobile-sheet-status\\[data-state="${state}"\\] \\{ border-color: var\\(${token}\\); \\}`), state);
  }
});

test("the status tokens have a default for every theme and the mobile entry loads it", async () => {
  const core = await read("css-next/tokens/core.css");
  for (const token of ["--color-danger", "--color-warning", "--color-success"]) {
    assert.match(core, new RegExp(`:root \\{[^}]*${token}: #[0-9a-f]{6};`), token);
  }
  assert.match(await read("css-next/index.css"), /@import url\("\.\/tokens\/core\.css/);
  assert.match(await read("css-next/pages/sheet-mobile-entry.css"), /@import url\("\.\.\/index\.css/);
});
