import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  normalizeSkillLevel,
  shouldSelectAllSuits,
  resolveSkillLevelAfterSuitChange
} from "../js/sheet-skill-level-suit-state.js";

test("skill level normalization clamps negative and blank values", () => {
  assert.equal(normalizeSkillLevel(-2), 0);
  assert.equal(normalizeSkillLevel(""), 0);
  assert.equal(normalizeSkillLevel("3"), 3);
});

test("level four or higher selects all suits", () => {
  assert.equal(shouldSelectAllSuits(3), false);
  assert.equal(shouldSelectAllSuits(4), true);
  assert.equal(shouldSelectAllSuits("5"), true);
});

test("adding suits raises level only when selected count exceeds it", () => {
  assert.equal(resolveSkillLevelAfterSuitChange({ currentLevel: 1, selectedSuitCount: 2, checked: true }), 2);
  assert.equal(resolveSkillLevelAfterSuitChange({ currentLevel: 3, selectedSuitCount: 2, checked: true }), 3);
});

test("removing a suit lowers level to the remaining selected count", () => {
  assert.equal(resolveSkillLevelAfterSuitChange({ currentLevel: 4, selectedSuitCount: 3, checked: false }), 3);
  assert.equal(resolveSkillLevelAfterSuitChange({ currentLevel: 2, selectedSuitCount: 0, checked: false }), 0);
});

test("helper remains DOM-free and delegated DOM rule loads it", async () => {
  const helperSource = await readFile(new URL("../js/sheet-skill-level-suit-state.js", import.meta.url), "utf8");
  const domSource = await readFile(new URL("../js/skill-level-suit-rules.js", import.meta.url), "utf8");
  assert.doesNotMatch(helperSource, /document\.|window\.|supabase|localStorage|sessionStorage|addEventListener/);
  assert.match(domSource, /sheet-skill-level-suit-state\.js\?v=1/);
  assert.match(domSource, /resolveSkillLevelAfterSuitChange/);
  assert.match(domSource, /shouldSelectAllSuits/);
});
