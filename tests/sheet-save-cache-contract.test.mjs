import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("sheet editor loads the current save coordinator through cache-busted assets", async () => {
  const [html, app, sheet] = await Promise.all([
    read("sheet.html"),
    read("js/sheet-app.js"),
    read("js/sheet.js")
  ]);
  assert.match(html, /sheet-app\.js\?v=2/);
  assert.match(app, /sheet\.js\?v=112/);
  assert.match(sheet, /sheet-save-coordinator\.js\?v=2/);
});
