import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-import-outfit-compat.js", import.meta.url), "utf8");

test("legacy outfit import creates rows through the current category table UI", () => {
  assert.match(source, /data-add-outfit-category/);
  assert.match(source, /async function createRaw/);
  assert.match(source, /const key=await createRaw\(item\)/);
  assert.match(source, /querySelectorAll\('\[data-outfit-key\]'\)|querySelectorAll\("\[data-outfit-key\]"\)/);
});

test("legacy outfit import supports DB-backed proxy fields", () => {
  assert.match(source, /function fieldControl\(row,field\)/);
  assert.match(source, /data-pc-outfit-proxy/);
  assert.match(source, /const base=\(field,value\)=>setValue\(fieldControl\(row,field\),value\)/);
});
