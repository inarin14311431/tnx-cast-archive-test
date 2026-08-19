import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/outfit-tables.js", import.meta.url), "utf8");

test("outfit table source distinguishes raw transport schema from canonical semantics", () => {
  assert.match(source, /const RAW_CARD_SCHEMAS=/);
  assert.match(source, /const BASE_LABELS=/);
  assert.match(source, /Canonical outfit semantics are owned by outfit-contract\.js/);
  assert.doesNotMatch(source, /const SCHEMAS=/);
  assert.doesNotMatch(source, /const LABELS=/);
});

test("raw table labels no longer expose retired outfit terminology", () => {
  assert.match(source, /concealment:'隠匿値'/);
  assert.match(source, /control_modifier:'制御値'/);
  assert.match(source, /cs_modifier:'CS修正'/);
  assert.match(source, /slot:'部位'/);
  assert.match(source, /mundane_modifier:''/);
  assert.doesNotMatch(source, /concealment:'隠匿'/);
  assert.doesNotMatch(source, /control_modifier:'制御'/);
  assert.doesNotMatch(source, /cs_modifier:'CS'/);
  assert.doesNotMatch(source, /mundane_modifier:'外界'/);
});

test("compatibility-only controls remain transported during reorder rebuild", () => {
  assert.match(source, /mundane_modifier/);
  assert.match(source, /function snapshot\(\)/);
  assert.match(source, /row\.querySelectorAll\('\[data-o\]'\)/);
  assert.match(source, /items\.forEach\(item=>addRawOutfit\(item\)\)/);
});
