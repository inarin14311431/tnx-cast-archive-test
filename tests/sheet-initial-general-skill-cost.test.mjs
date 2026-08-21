import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CREATION_ALLOWANCE,
  INITIAL_GENERAL_SKILL_COUNT,
  INITIAL_GENERAL_SKILL_COST,
  INITIAL_SOCIAL_SKILL_COST,
  INITIAL_CONNECTION_SKILL_COST,
  INITIAL_SKILL_COST,
  paidFixedInitialGeneralLevel,
  paidFlexibleInitialSkillCost
} from "../js/sheet-experience-rules.js";

test("initial skill package is 13 fixed General levels plus Social 4 and Connection 3", () => {
  assert.equal(INITIAL_GENERAL_SKILL_COUNT, 13);
  assert.equal(INITIAL_GENERAL_SKILL_COST, 13 * 10);
  assert.equal(INITIAL_SOCIAL_SKILL_COST, 4 * 5);
  assert.equal(INITIAL_CONNECTION_SKILL_COST, 3 * 5);
  assert.equal(INITIAL_SKILL_COST, 165);
  assert.equal(INITIAL_GENERAL_SKILL_COST + INITIAL_SOCIAL_SKILL_COST + INITIAL_CONNECTION_SKILL_COST, INITIAL_SKILL_COST);
  assert.equal(CREATION_ALLOWANCE, 170);
});

test("fixed General allowance cannot be transferred to added skills", () => {
  assert.equal(paidFixedInitialGeneralLevel(1), 0);
  assert.equal(paidFixedInitialGeneralLevel(2), 1);
  assert.equal(paidFixedInitialGeneralLevel(0), 0);
});

test("Social and Connection allowances cannot offset each other", () => {
  assert.equal(paidFlexibleInitialSkillCost({ social: 25, connection: 15 }).total, 5);
  assert.equal(paidFlexibleInitialSkillCost({ social: 5, connection: 30 }).total, 15);
  assert.equal(paidFlexibleInitialSkillCost({ social: 20, connection: 15 }).total, 0);
  assert.equal(INITIAL_SKILL_COST + CREATION_ALLOWANCE, 335);
});

test("desktop and mobile calculators use fixed-General and split Social/Connection rules", async () => {
  const desktop = await readFile(new URL("../js/experience.js", import.meta.url), "utf8");
  const mobile = await readFile(new URL("../js/sheet-mobile-header-exp.js", import.meta.url), "utf8");
  assert.match(desktop, /isInitialGeneralSkill/);
  assert.match(desktop, /paidFixedInitialGeneralLevel/);
  assert.match(desktop, /paidFlexibleInitialSkillCost/);
  assert.match(mobile, /isInitialGeneralSkill/);
  assert.match(mobile, /paidFixedInitialGeneralLevel/);
  assert.match(mobile, /paidFlexibleInitialSkillCost/);
  assert.match(desktop, /sheet-experience-rules\.js\?v=5/);
  assert.match(mobile, /sheet-experience-rules\.js\?v=5/);
});
