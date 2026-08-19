import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const shim = await readFile(new URL("../js/armor-grand-total.js", import.meta.url), "utf8");
const tables = await readFile(new URL("../js/outfit-tables.js", import.meta.url), "utf8");

test("armor total compatibility entry no longer owns outfit DOM behavior", () => {
  assert.match(shim, /Armor defense totals are owned by outfit-tables\.js/);
  assert.doesNotMatch(shim, /#outfit-list|MutationObserver|addEventListener|data-armor-defense|data-armor-total/);
});

test("outfit tables owns armor totals from canonical OFC S P I fields", () => {
  assert.match(tables, /function makeArmorFooter\(\)/);
  assert.match(tables, /function updateArmorTotals\(section\)/);
  assert.match(tables, /\[data-ofc="defense_\$\{key\}"\]/);
  assert.match(tables, /data\.armorTotal|dataset\.armorTotal|data-armor-total/);
  assert.match(tables, /\[data-ofc="defense_s"\],\[data-ofc="defense_p"\],\[data-ofc="defense_i"\]/);
  assert.doesNotMatch(tables, /data-armor-defense|dataset\.armorDefense/);
});
