import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/udonarium-export.js", import.meta.url), "utf8");

test("Udonarium export carries CS right after 報酬点 in アクトデータ", () => {
  assert.match(source, /divine_1, divine_2, divine_3,\s*cs, mundane_value/);
  assert.match(source, /cs: numberText\("cs-final"\)/);
  assert.match(source, /<data name="報酬点"[^\n]*\n\s*<data name="CS">\$\{combatSpeed\}<\/data>/);
});
