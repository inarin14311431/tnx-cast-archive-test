import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CREATION_ALLOWANCE,
  INITIAL_GENERAL_SKILL_COST,
  INITIAL_SOCIAL_CONNECTION_SKILL_COST,
  INITIAL_SKILL_COST,
  paidInitialSkillCost,
  paidSkillLevel,
  resolveCanonicalCurrent,
  steppedExperienceCost
} from "../js/sheet-experience-rules.js";

test("paid skill level excludes imported free levels without going negative", () => {
  assert.equal(paidSkillLevel(1, 1), 0);
  assert.equal(paidSkillLevel(3, 1), 2);
  assert.equal(paidSkillLevel(2, 9), 0);
  assert.equal(paidSkillLevel(2, -1), 2);
});

test("construction constants keep general and social/connection initial pools separate", () => {
  assert.equal(INITIAL_GENERAL_SKILL_COST, 130);
  assert.equal(INITIAL_SOCIAL_CONNECTION_SKILL_COST, 35);
  assert.equal(INITIAL_SKILL_COST, 165);
  assert.equal(CREATION_ALLOWANCE, 170);
});

test("unused social/connection allowance cannot offset paid general skills", () => {
  assert.deepEqual(paidInitialSkillCost({ general: 160, socialConnection: 20 }), {
    general: 30,
    socialConnection: 0,
    total: 30
  });
  assert.equal(Math.max(0, 160 + 20 - 165), 15);
});

test("unused general allowance cannot offset paid social/connection skills", () => {
  assert.deepEqual(paidInitialSkillCost({ general: 120, socialConnection: 50 }), {
    general: 0,
    socialConnection: 15,
    total: 15
  });
});

test("a standard initial skill package remains free", () => {
  assert.deepEqual(paidInitialSkillCost({ general: 130, socialConnection: 35 }), {
    general: 0,
    socialConnection: 0,
    total: 0
  });
});

test("canonical current value wins over stale growth and falls back when absent", () => {
  assert.equal(resolveCanonicalCurrent({ baseline: 6, current: 8, growth: 0 }), 8);
  assert.equal(resolveCanonicalCurrent({ baseline: 6, current: "", growth: 2 }), 8);
  assert.equal(resolveCanonicalCurrent({ baseline: 6, current: null, growth: 3 }), 9);
});

test("stepped experience cost follows ability and control thresholds", () => {
  assert.equal(steppedExperienceCost(6, 8, 10), 40);
  assert.equal(steppedExperienceCost(9, 11, 10), 60);
  assert.equal(steppedExperienceCost(15, 17, 16), 60);
  assert.equal(steppedExperienceCost(8, 7, 10), 0);
});

test("desktop and mobile calculators share canonical experience rules", async () => {
  const desktop = await readFile(new URL("../js/experience.js", import.meta.url), "utf8");
  const mobile = await readFile(new URL("../js/sheet-mobile-header-exp.js", import.meta.url), "utf8");
  assert.match(desktop, /sheet-experience-rules\.js\?v=4/);
  assert.match(desktop, /paidInitialSkillCost\(skills\)/);
  assert.match(desktop, /socialConnection/);
  assert.match(mobile, /sheet-experience-rules\.js\?v=4/);
  assert.match(mobile, /paidInitialSkillCost\(\{general,socialConnection\}\)\.total/);
  assert.match(mobile, /current:character\[`\$\{key\}_base`\]/);
  assert.match(mobile, /current:character\[`\$\{key\}_control_base`\]/);
  assert.match(mobile, /select\("id,skill_kind,free_level"\)/);
});
