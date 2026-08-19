import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createBlankSkill, createBlankOutfit } from "../js/sheet-row-factory.js";

test("skill factory preserves category defaults and explicit ordering", () => {
  const general = createBlankSkill("general", { key: "skill-general", sortOrder: 4 });
  const style = createBlankSkill("style", { key: "skill-style", sortOrder: 7 });
  const social = createBlankSkill("social", { key: "skill-social", sortOrder: 9 });

  assert.equal(general._key, "skill-general");
  assert.equal(general.sort_order, 4);
  assert.equal(general.skill_kind, "general");
  assert.equal(style.skill_kind, "normal");
  assert.equal(social.skill_kind, "proper");
  assert.deepEqual(
    [general.reason, general.passion, general.life, general.mundane],
    [false, false, false, false]
  );
  assert.equal(general.level, 1);
  assert.equal(general.free_level, 0);
  assert.equal(general.description, "");
});

test("outfit factory preserves canonical blank base state only", () => {
  const outfit = createBlankOutfit({ key: "outfit-1", sortOrder: 3 });

  assert.deepEqual(outfit, {
    _key: "outfit-1",
    category: "other",
    name: "",
    purchase_value: "",
    experience_cost: 0,
    concealment: "",
    attack: "",
    range: "",
    slot: "",
    description: "",
    sort_order: 3
  });
  assert.equal("defense" in outfit, false);
  assert.equal("control_modifier" in outfit, false);
  assert.equal("cs_modifier" in outfit, false);
  assert.equal("mundane_modifier" in outfit, false);
});

test("classic sheet keeps collection-aware ordering while delegating row defaults", async () => {
  const source = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  const factory = await readFile(new URL("../js/sheet-row-factory.js", import.meta.url), "utf8");

  assert.match(source, /createBlankSkill\(category, \{ sortOrder: skills\.length \}\)/);
  assert.match(source, /createBlankOutfit\(\{ sortOrder: outfits\.length \}\)/);
  assert.doesNotMatch(factory, /\bdocument\b|\bwindow\b|\bskills\b|\boutfits\b/);
  assert.doesNotMatch(factory, /save|persist|render|markDirty|recalc/);
});
