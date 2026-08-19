import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const shim = await readFile(new URL("../js/armor-grand-total.js", import.meta.url), "utf8");
const tables = await readFile(new URL("../js/outfit-tables.js", import.meta.url), "utf8");

test("armor total compatibility entry no longer owns outfit DOM behavior", () => {
  assert.match(shim, /Armor defense totals are owned by outfit-tables\.js/);
  assert.doesNotMatch(shim, /#outfit-list|MutationObserver|addEventListener|data-armor-defense|data-armor-total/);
});

test("outfit tables owns armor defense total rendering and synchronization", () => {
  assert.match(tables, /function makeArmorFooter\(\)/);
  assert.match(tables, /function updateArmorTotals\(section\)/);
  assert.match(tables, /dataArmorDefense|data\.armorDefense|dataset\.armorDefense/);
  assert.match(tables, /data\.armorTotal|dataset\.armorTotal|data-armor-total/);
  assert.match(tables, /updateArmorTotals\(card\.closest\('\.outfit-table-group--armor'\)\)/);
});
