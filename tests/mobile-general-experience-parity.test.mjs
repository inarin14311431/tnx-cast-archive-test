import test from "node:test";
import assert from "node:assert/strict";
import { CREATION_ALLOWANCE, generalSkillExperienceCost } from "../js/sheet-experience-rules.js";
import { INITIAL_GENERAL_SKILL_SUITS, STARRED_GENERAL_NAMES } from "../js/general-skill-catalog.js";
import { mobileGeneralDisplayName, mobileGeneralRowName } from "../js/sheet-mobile-general-display.js";

const INITIAL_NAMES = Object.keys(INITIAL_GENERAL_SKILL_SUITS);

// A mobile general row as rendered by sheet-mobile-skills.js after the ★ display pass.
function mobileRow(name, { withDataName = true } = {}) {
  const label = { textContent: mobileGeneralDisplayName(name) };
  return {
    dataset: withDataName ? { generalId: name, generalName: name } : { generalId: name },
    querySelector: selector => (selector === ".mobile-general-display-name" ? label : null)
  };
}

function freshCastSkills(overrides = {}) {
  return INITIAL_NAMES.map(name => ({ name, category: "general", level: overrides[name] ?? 1, freeLevel: 0, kind: "general" }));
}

// PC reads the raw name from the row's name input; mobile resolves it from the rendered row.
function pcTotal(skills) {
  return generalSkillExperienceCost(skills).total - CREATION_ALLOWANCE;
}
function mobileTotal(skills, options) {
  const rows = skills.map(skill => ({ ...skill, name: mobileGeneralRowName(mobileRow(skill.name, options)) }));
  return generalSkillExperienceCost(rows).total - CREATION_ALLOWANCE;
}

test("starred initial skills are displayed with ★ but resolve to their stored names", () => {
  const starredInitial = INITIAL_NAMES.filter(name => STARRED_GENERAL_NAMES.has(name));
  assert.equal(starredInitial.length, 7);
  for (const name of starredInitial) {
    assert.equal(mobileGeneralDisplayName(name), `★${name}`);
    assert.equal(mobileGeneralRowName(mobileRow(name)), name);
    assert.equal(mobileGeneralRowName(mobileRow(name, { withDataName: false })), name);
  }
  assert.equal(mobileGeneralRowName({ dataset: {}, querySelector: () => ({ textContent: "名称未入力" }) }), "");
});

test("a freshly created cast costs -170 on both PC and mobile", () => {
  assert.equal(pcTotal(freshCastSkills()), -170);
  assert.equal(mobileTotal(freshCastSkills()), -170);
  assert.equal(mobileTotal(freshCastSkills(), { withDataName: false }), -170);
});

test("the ★ display label would have charged the 7 starred initial skills (the -100 bug)", () => {
  const labelled = freshCastSkills().map(skill => ({ ...skill, name: mobileGeneralDisplayName(skill.name) }));
  assert.equal(generalSkillExperienceCost(labelled).total - CREATION_ALLOWANCE, -100);
});

test("raising a starred initial skill to level 2 adds 10 on both PC and mobile", () => {
  const skills = freshCastSkills({ 射撃: 2 });
  assert.equal(pcTotal(skills), -160);
  assert.equal(mobileTotal(skills), -160);
});

test("PC and mobile agree on mixed general, proper, social and connection skills", () => {
  const skills = [
    ...freshCastSkills({ 心理: 3, 回避: 2 }),
    { name: "操縦：車両", category: "general", level: 2, freeLevel: 0, kind: "proper" },
    { name: "社会：ストリート", category: "social", level: 4, freeLevel: 0, kind: "proper" },
    { name: "コネ：情報屋", category: "connection", level: 5, freeLevel: 1, kind: "proper" }
  ];
  const expected = generalSkillExperienceCost(skills);
  // 心理 Lv3 → 2 paid levels, 回避 Lv2 → 1, 操縦：車両 (proper) Lv2 → 2 × 5.
  assert.equal(expected.general, 20 + 10 + 10);
  assert.equal(expected.socialConnection, Math.max(0, (4 + 4) * 5 - 35));
  assert.equal(mobileTotal(skills), pcTotal(skills));
});

test("mobile rows carry the stored name and rule code reads it instead of the display label", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
  assert.match(await read("js/sheet-mobile-skills.js"), /data-general-name="\$\{esc\(item\.name \|\| ""\)\}"/);
  const rules = await read("js/sheet-mobile-initial-general-rules.js");
  assert.match(rules, /const name = mobileGeneralRowName\(row\);/);
  assert.doesNotMatch(rules, /mobile-general-display-name/);
});
