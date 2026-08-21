import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CREATION_ALLOWANCE, INITIAL_GENERAL_SKILL_COST } from "../js/sheet-experience-rules.js";

test("initial skill package is 13 general levels plus 7 social/connection levels", () => {
  assert.equal(13 * 10, 130);
  assert.equal(7 * 5, 35);
  assert.equal(INITIAL_GENERAL_SKILL_COST, 165);
  assert.equal(130 + 35, INITIAL_GENERAL_SKILL_COST);
  assert.equal(CREATION_ALLOWANCE, 170);
});

test("skill allowance and construction growth allowance are separate", () => {
  assert.equal(165 - INITIAL_GENERAL_SKILL_COST, 0);
  assert.equal(335 - INITIAL_GENERAL_SKILL_COST - CREATION_ALLOWANCE, 0);
  assert.equal(260 - INITIAL_GENERAL_SKILL_COST, 95);
});

test("desktop and mobile calculators use the shared initial skill allowance", async () => {
  const desktop = await readFile(new URL("../js/experience.js", import.meta.url), "utf8");
  const mobile = await readFile(new URL("../js/sheet-mobile-header-exp.js", import.meta.url), "utf8");
  assert.match(desktop, /INITIAL_GENERAL_SKILL_COST/);
  assert.match(mobile, /INITIAL_GENERAL_SKILL_COST/);
  assert.match(desktop, /sheet-experience-rules\.js\?v=3/);
  assert.match(mobile, /sheet-experience-rules\.js\?v=3/);
});
