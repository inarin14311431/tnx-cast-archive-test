import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mobileExp=await readFile(new URL("../js/sheet-mobile-header-exp.js",import.meta.url),"utf8");
const normalizer=await readFile(new URL("../js/sheet-mobile-skill-kind-normalizer.js",import.meta.url),"utf8");
const app=await readFile(new URL("../js/sheet-mobile-app.js",import.meta.url),"utf8");

test("mobile style skill experience reads the actual rendered kind label",()=>{
  assert.match(mobileExp,/mobile-style-skill-card__secondary span/);
  assert.doesNotMatch(mobileExp,/mobile-edit-card__meta span/);
  assert.match(mobileExp,/秘技:"secret"/);
  assert.match(mobileExp,/奥義:"ultimate"/);
});

test("mobile general skills are normalized to the PC skill-kind rule",()=>{
  assert.match(normalizer,/PROPER_GENERAL_PREFIXES=\["製作：","芸術：","操縦："\]/);
  assert.match(normalizer,/return PROPER_GENERAL_PREFIXES\.some\(prefix=>text\.startsWith\(prefix\)\)\?"proper":"general"/);
  assert.match(normalizer,/tnx:mobile-skills-saved/);
  assert.match(normalizer,/tnx:mobile-skill-kind-normalized/);
});

test("mobile experience applies separate general and social/connection initial pools",()=>{
  assert.match(mobileExp,/paidInitialSkillCost/);
  assert.match(mobileExp,/socialConnection/);
  assert.match(mobileExp,/sheet-experience-rules\.js\?v=4/);
  assert.doesNotMatch(mobileExp,/total-INITIAL_GENERAL_SKILL_COST/);
});

test("mobile app loads skill-kind normalization before experience calculation",()=>{
  const normalizeIndex=app.indexOf("sheet-mobile-skill-kind-normalizer.js");
  const expIndex=app.indexOf("sheet-mobile-header-exp.js");
  assert.ok(normalizeIndex>=0&&normalizeIndex<expIndex);
  assert.match(app,/sheet-mobile-header-exp\.js\?v=20260821-1/);
});
