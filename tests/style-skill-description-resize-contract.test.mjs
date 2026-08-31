import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("style skill description textarea can be resized vertically", async () => {
  const renderer = await read("js/sheet-skill-renderer.js");
  const css = await read("css-next/editor/style-skills.css");
  const entry = await read("css-next/pages/sheet-entry.css");

  assert.match(renderer, /<textarea data-f="description" rows="2">/);
  assert.match(css, /#style-skills textarea\[data-f="description"\]\s*\{[\s\S]*?resize:\s*vertical;/);
  assert.doesNotMatch(css, /textarea\[data-style-field="description"\]/);
  assert.match(entry, /style-skills\.css\?v=12/);
});
