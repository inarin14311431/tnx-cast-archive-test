import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fields = await readFile(new URL("../js/outfit-ofc-fields.js", import.meta.url), "utf8");
const layout = await readFile(new URL("../js/outfit-display-rules-v5.js", import.meta.url), "utf8");
const tables = await readFile(new URL("../js/outfit-tables.js", import.meta.url), "utf8");

test("armor S P I editor fields are canonical OFC detail controls", () => {
  assert.match(fields, /armor:\s*\[\.\.\.COMMON_FIELDS,\s*"defense_s",\s*"defense_p",\s*"defense_i",\s*"electronic_control"\]/);
  assert.match(layout, /\["ofc","defense_s","S"\],\["ofc","defense_p","P"\]/);
  assert.match(layout, /\["ofc","defense_i","I"\]/);
  assert.doesNotMatch(layout, /\["base","defense_s","S"\]/);
  assert.doesNotMatch(layout, /\["base","defense_p","P"\]/);
  assert.doesNotMatch(layout, /\["base","defense_i","I"\]/);
});

test("armor detail collection prefers canonical OFC S P I values", () => {
  assert.match(fields, /row\.querySelector\('\[data-ofc="defense_s"\]'\)\?\.value \|\| details\.defense_s \|\| armorDefense\.defense_s/);
  assert.match(fields, /row\.querySelector\('\[data-ofc="defense_p"\]'\)\?\.value \|\| details\.defense_p \|\| armorDefense\.defense_p/);
  assert.match(fields, /row\.querySelector\('\[data-ofc="defense_i"\]'\)\?\.value \|\| details\.defense_i \|\| armorDefense\.defense_i/);
});

test("legacy armor defense backing is mirror-only during transition", () => {
  assert.match(layout, /function syncArmorDefenseBridge/);
  assert.match(layout, /function syncArmorDefenseRow/);
  assert.match(layout, /legacy\.dispatchEvent\(new Event\("input"/);
  assert.match(tables, /function parseArmorDefense/);
  assert.match(tables, /function updateArmorDefense/);
});
