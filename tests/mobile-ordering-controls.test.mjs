import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("mobile style skills expose ordering controls for normal skills and separators", async () => {
  const source = await read("../js/sheet-mobile-skills.js");
  assert.match(source, /data-style-order-id=/);
  assert.match(source, /data-move-style="up"/);
  assert.match(source, /data-move-style="down"/);
  assert.match(source, /function moveStyleItem\(id, direction\)/);
  assert.match(source, /item\.sort_order = i \* 10/);
  assert.match(source, /dirtyIds\.add\(String\(item\.id\)\)/);
});

test("mobile outfits reorder one flat list regardless of category", async () => {
  const source = await read("../js/sheet-mobile-outfit.js");
  assert.match(source, /function moveOutfit\(id, direction\)/);
  assert.match(source, /data-move-outfit="up"/);
  assert.match(source, /data-move-outfit="down"/);
  assert.match(source, /item\.sort_order = i \* 10/);
  assert.match(source, /dirtyIds\.add\(String\(item\.id\)\)/);
  assert.doesNotMatch(source, /groupByCategory|categoryGroups|groupedOutfits/);
});

test("mobile ordering assets are cache-busted", async () => {
  const app = await read("../js/sheet-mobile-app.js");
  const styles = await read("../js/sheet-mobile-ordering-style-refresh.js");
  assert.match(app, /sheet-mobile-skills\.js\?v=20260820-5/);
  assert.match(app, /sheet-mobile-outfit\.js\?v=20260820-7/);
  assert.match(styles, /sheet-mobile-skills\.css\?v=6/);
  assert.match(styles, /sheet-mobile-outfit\.css\?v=9/);
});
