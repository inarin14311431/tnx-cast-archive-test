import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { INITIAL_GENERAL_SKILL_COST } from "../js/sheet-experience-rules.js";

test("initial general skill allowance matches classic character-sheet accounting", () => {
  assert.equal(INITIAL_GENERAL_SKILL_COST, 190);
  assert.equal(260 - INITIAL_GENERAL_SKILL_COST, 70);
});

test("desktop and mobile calculators use the shared initial general skill allowance", async () => {
  const desktop = await readFile(new URL("../js/experience.js", import.meta.url), "utf8");
  const mobile = await readFile(new URL("../js/sheet-mobile-header-exp.js", import.meta.url), "utf8");
  assert.match(desktop, /INITIAL_GENERAL_SKILL_COST/);
  assert.match(mobile, /INITIAL_GENERAL_SKILL_COST/);
  assert.doesNotMatch(desktop, /INITIAL_SKILL_COST\s*=\s*165/);
  assert.doesNotMatch(mobile, /INITIAL_SKILL_COST\s*=\s*165/);
});
