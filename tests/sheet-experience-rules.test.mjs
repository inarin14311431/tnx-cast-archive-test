import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
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
  assert.match(desktop, /sheet-experience-rules\.js\?v=1/);
  assert.match(desktop, /paidSkillLevel\(level,freeLevel\)/);
  assert.match(mobile, /sheet-experience-rules\.js\?v=1/);
  assert.match(mobile, /current:character\[`\$\{key\}_base`\]/);
  assert.match(mobile, /current:character\[`\$\{key\}_control_base`\]/);
  assert.match(mobile, /select\("id,skill_kind,free_level"\)/);
});
