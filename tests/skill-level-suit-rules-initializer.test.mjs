import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = process.cwd();
const source = fs.readFileSync(path.join(ROOT, "js", "skill-level-suit-rules.js"), "utf8");

test("skill level suit rules has an explicit idempotent delegated initializer", () => {
  assert.match(source, /function\s+initializeSkillLevelSuitRules\s*\(/);
  assert.match(source, /dataset\.levelSuitRulesObserver===\"1\"/);
  assert.match(source, /dataset\.levelSuitRulesObserver=\"1\"/);
  assert.match(source, /root\.addEventListener\(\"input\",handleInput\)/);
  assert.match(source, /initializeSkillLevelSuitRules\(\);/);
});

test("skill level suit rules keeps increase, decrease, and level-four contracts", () => {
  assert.match(source, /if\(value<4\)return/);
  assert.match(source, /box\.checked=true/);
  assert.match(source, /if\(control\.checked\)return/);
  assert.match(source, /level\.value=String\(selectedCount\(row\)\)/);
  assert.match(source, /dispatchInput\(level\)/);
  assert.match(source, /setTimeout\(initializeSkillLevelSuitRules,100\)/);
});

test("skill level suit rules no longer depends on per-row oninput ownership", () => {
  assert.doesNotMatch(source, /typeof\s+level\.oninput/);
  assert.doesNotMatch(source, /originalSuitHandlers/);
  assert.doesNotMatch(source, /MutationObserver/);
});
