import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CREATION_ALLOWANCE,
  INITIAL_GENERAL_SKILL_COST,
  INITIAL_SOCIAL_CONNECTION_SKILL_COST,
  INITIAL_SKILL_COST,
  paidInitialSkillCost
} from "../js/sheet-experience-rules.js";

test("initial skill package is 13 general levels plus 7 social/connection levels", () => {
  assert.equal(13 * 10, 130);
  assert.equal(7 * 5, 35);
  assert.equal(INITIAL_GENERAL_SKILL_COST, 130);
  assert.equal(INITIAL_SOCIAL_CONNECTION_SKILL_COST, 35);
  assert.equal(INITIAL_SKILL_COST, 165);
  assert.equal(INITIAL_GENERAL_SKILL_COST + INITIAL_SOCIAL_CONNECTION_SKILL_COST, INITIAL_SKILL_COST);
  assert.equal(CREATION_ALLOWANCE, 170);
});

test("skill pools and construction growth allowance are separate", () => {
  assert.equal(paidInitialSkillCost({ general: 130, socialConnection: 35 }).total, 0);
  assert.equal(paidInitialSkillCost({ general: 160, socialConnection: 20 }).total, 30);
  assert.equal(paidInitialSkillCost({ general: 120, socialConnection: 50 }).total, 15);
  assert.equal(INITIAL_SKILL_COST + CREATION_ALLOWANCE, 335);
});

test("desktop and mobile calculators use the shared split initial skill allowance", async () => {
  const desktop = await readFile(new URL("../js/experience.js", import.meta.url), "utf8");
  const mobile = await readFile(new URL("../js/sheet-mobile-header-exp.js", import.meta.url), "utf8");
  assert.match(desktop, /paidInitialSkillCost/);
  assert.match(desktop, /socialConnection/);
  assert.match(mobile, /paidInitialSkillCost/);
  assert.match(mobile, /socialConnection/);
  assert.match(desktop, /sheet-experience-rules\.js\?v=4/);
  assert.match(mobile, /sheet-experience-rules\.js\?v=4/);
});
