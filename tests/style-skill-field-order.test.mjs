import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// Outfits put 参照P before 解説; style skills follow the same order in the editor and the viewer.
test("editor style skill fields put 参照P before 解説", async () => {
  const source = await read("js/style-skill-fields.js");
  assert.match(source, /\["confrontation","対決","input"\],\s*\["page","参照P","input"\],\s*\["description","解説","textarea"\]\s*\]/);
});

test("viewer style skill columns put 参照P before 解説", async () => {
  const source = await read("js/cast-style-skills.js");
  assert.match(source, /\["confrontation", "対決"\],\s*\["page", "参照P"\], \["description", "解説"\]\s*\]/);
  assert.match(source, /<col class="style-col-confrontation"><col class="style-col-page"><col class="style-col-description"><\/colgroup>/);

  const controls = await read("js/cast-style-skill-table-controls.js");
  assert.match(controls, /const FALLBACK_WIDTHS = \[[^\]]*, 64, 340\];/);
});
