import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CREATION_ALLOWANCE,
  INITIAL_GENERAL_SKILL_COUNT,
  INITIAL_GENERAL_SKILL_COST,
  INITIAL_SOCIAL_SKILL_LEVELS,
  INITIAL_SOCIAL_SKILL_COST,
  INITIAL_CONNECTION_SKILL_LEVELS,
  INITIAL_CONNECTION_SKILL_COST,
  INITIAL_SKILL_COST,
  paidFixedInitialGeneralLevel,
  paidFlexibleInitialSkillCost,
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

test("construction constants model 13 fixed General, 4 Social and 3 Connection levels", () => {
  assert.equal(INITIAL_GENERAL_SKILL_COUNT, 13);
  assert.equal(INITIAL_GENERAL_SKILL_COST, 130);
  assert.equal(INITIAL_SOCIAL_SKILL_LEVELS, 4);
  assert.equal(INITIAL_SOCIAL_SKILL_COST, 20);
  assert.equal(INITIAL_CONNECTION_SKILL_LEVELS, 3);
  assert.equal(INITIAL_CONNECTION_SKILL_COST, 15);
  assert.equal(INITIAL_SKILL_COST, 165);
  assert.equal(CREATION_ALLOWANCE, 170);
});

test("each fixed initial General skill gets exactly its first level free", () => {
  assert.equal(paidFixedInitialGeneralLevel(1), 0);
  assert.equal(paidFixedInitialGeneralLevel(2), 1);
  assert.equal(paidFixedInitialGeneralLevel(3), 2);
});

test("Social and Connection free pools are independent", () => {
  assert.deepEqual(paidFlexibleInitialSkillCost({ social: 25, connection: 15 }), {
    social: 5,
    connection: 0,
    total: 5
  });
  assert.deepEqual(paidFlexibleInitialSkillCost({ social: 5, connection: 30 }), {
    social: 0,
    connection: 15,
    total: 15
  });
  assert.deepEqual(paidFlexibleInitialSkillCost({ social: 20, connection: 15 }), {
    social: 0,
    connection: 0,
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

test("desktop and mobile calculators share exact initial experience rules", async () => {
  const desktop = await readFile(new URL("../js/experience.js", import.meta.url), "utf8");
  const mobile = await readFile(new URL("../js/sheet-mobile-header-exp.js", import.meta.url), "utf8");
  assert.match(desktop, /general-skill-catalog\.js/);
  assert.match(desktop, /sheet-experience-rules\.js\?v=5/);
  assert.match(desktop, /paidFixedInitialGeneralLevel/);
  assert.match(desktop, /paidFlexibleInitialSkillCost\(\{social,connection\}\)/);
  assert.match(mobile, /general-skill-catalog\.js/);
  assert.match(mobile, /sheet-experience-rules\.js\?v=5/);
  assert.match(mobile, /paidFixedInitialGeneralLevel/);
  assert.match(mobile, /paidFlexibleInitialSkillCost\(\{social,connection\}\)/);
  assert.match(mobile, /current:character\[`\$\{key\}_base`\]/);
  assert.match(mobile, /current:character\[`\$\{key\}_control_base`\]/);
  assert.match(mobile, /select\("id,skill_kind,free_level"\)/);
});
