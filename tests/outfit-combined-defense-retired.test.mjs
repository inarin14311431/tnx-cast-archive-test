import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const save = await readFile(new URL("../js/outfit-ofc-save.js", import.meta.url), "utf8");

test("PC OFC save no longer rebuilds combined outfit defense", () => {
  assert.doesNotMatch(save, /function composeDefense/);
  assert.doesNotMatch(save, /category === "vehicle" \? composeDefense/);
  assert.match(save, /defense:\s*""/);
  assert.match(save, /defense_s:/);
  assert.match(save, /defense_p:/);
  assert.match(save, /defense_i:/);
});
