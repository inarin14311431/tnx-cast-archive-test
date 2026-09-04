import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fields = await readFile(new URL("../js/style-skill-fields.js", import.meta.url), "utf8");

test("style skill backing description is not treated as an editable projected field", () => {
  assert.match(fields, /delete original\.dataset\.styleField;/);
  assert.match(fields, /row\.querySelectorAll\("\[data-style-field\]"\)\.forEach\(element=>\{\s*if\(element===original\)return;/);
});

test("nested legacy style details are unwrapped so reference page can be restored", () => {
  assert.match(fields, /for\(let depth=0;depth<8;depth\+\+\)/);
  assert.match(fields, /const nested=decode\(data\.description\);/);
  assert.match(fields, /if\(isBlank\(data\[key\]\)&&!isBlank\(nested\[key\]\)\)data\[key\]=nested\[key\];/);
  assert.match(fields, /data\.description=String\(nested\.description\?\?""\);/);
});
