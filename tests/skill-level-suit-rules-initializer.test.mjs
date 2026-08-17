import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = process.cwd();
const source = fs.readFileSync(path.join(ROOT, "js", "skill-level-suit-rules.js"), "utf8");

test("skill level suit rules has an explicit idempotent initializer", () => {
  assert.match(source, /function\s+initializeSkillLevelSuitRules\s*\(/);
  assert.match(source, /dataset\.levelSuitRulesObserver===\"1\"/);
  assert.match(source, /dataset\.levelSuitRulesObserver=\"1\"/);
  assert.match(source, /initializeSkillLevelSuitRules\(\);/);
});

test("skill level suit rules keeps existing synchronization contracts", () => {
  assert.match(source, /value>=4/);
  assert.match(source, /wasChecked&&!isChecked/);
  assert.match(source, /selectedCount\(row\)/);
  assert.match(source, /new MutationObserver\(queue\)\.observe\(root,\{childList:true,subtree:true\}\)/);
  assert.match(source, /setTimeout\(initializeSkillLevelSuitRules,100\)/);
});
