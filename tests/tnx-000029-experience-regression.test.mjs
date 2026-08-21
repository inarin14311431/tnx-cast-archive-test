import test from "node:test";
import assert from "node:assert/strict";
import { paidFixedInitialGeneralLevel, paidFlexibleInitialSkillCost, CREATION_ALLOWANCE } from "../js/sheet-experience-rules.js";

test("TNX-000029 remains 15 XP under the exact initial acquisition rules", () => {
  // Fixed General skills: 13 skills start at Lv1 for free. Only 電脳 is Lv2.
  const fixedGeneralGrowth = paidFixedInitialGeneralLevel(2) * 10;
  // Added proper General skills: 芸術：歌唱3, 製作：ドローン1, 操縦：ドローン3.
  const addedProperGeneral = (3 + 1 + 3) * 5;
  // Social is 5 total levels against a 4-level initial pool; Connection is 3 against 3.
  const flexible = paidFlexibleInitialSkillCost({ social: 5 * 5, connection: 3 * 5 });
  const styleSkills = 100;
  const outfits = 35;
  const abilityAndControl = 0;
  const total = fixedGeneralGrowth + addedProperGeneral + flexible.total + styleSkills + outfits + abilityAndControl - CREATION_ALLOWANCE;

  assert.equal(fixedGeneralGrowth, 10);
  assert.equal(addedProperGeneral, 35);
  assert.equal(flexible.social, 5);
  assert.equal(flexible.connection, 0);
  assert.equal(total, 15);
});
