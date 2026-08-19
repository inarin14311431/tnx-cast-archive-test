import test from "node:test";
import assert from "node:assert/strict";
import { cloneOutfit, collectOutfitRecord } from "../js/sheet-mobile-outfit-model.js";

test("mobile outfit reads legacy combined concealment but saves split fields", () => {
  const item = cloneOutfit({
    id: "legacy",
    category: "weapon",
    name: "LEGACY",
    concealment: "12/-1",
    ofc_details: {}
  });
  assert.equal(item._concealValue, "12");
  assert.equal(item._concealMod, "-1");

  const record = collectOutfitRecord(item, { id: "character" });
  assert.equal(record.concealment, "12");
  assert.equal(record.ofc_details.concealment, "12");
  assert.equal(record.ofc_details.concealment_penalty, "-1");
});

test("mobile outfit prefers structured concealment modifier", () => {
  const item = cloneOutfit({
    category: "armor",
    name: "ARMOR",
    concealment: "10/0",
    ofc_details: { concealment_penalty: "-2" }
  });
  assert.equal(item._concealValue, "10");
  assert.equal(item._concealMod, "-2");
});

test("mobile outfit keeps control_modifier canonical without generating control_value", () => {
  const item = cloneOutfit({
    category: "vehicle",
    name: "VEHICLE",
    control_modifier: -2,
    ofc_details: {}
  });
  assert.equal(item.control_modifier, -2);
  assert.equal(item.ofc_details.control_value, "");

  const record = collectOutfitRecord(item, { id: "character" });
  assert.equal(record.control_modifier, -2);
  assert.equal(Object.hasOwn(record.ofc_details, "control_value"), false);
});
