import test from "node:test";
import assert from "node:assert/strict";
import {
  OUTFIT_BASE_FIELDS,
  OUTFIT_DESCRIPTION_FIELDS,
  OUTFIT_LEGACY_READ_ONLY_DETAIL_FIELDS,
  outfitPerformanceFields,
  outfitSupportsControl,
  outfitSupportsCsModifier
} from "../js/outfit-contract.js";

test("canonical outfit contract fixes common and description groups", () => {
  assert.deepEqual(OUTFIT_BASE_FIELDS, [
    "name", "purchase_value", "experience_cost", "concealment", "concealment_penalty", "slot"
  ]);
  assert.deepEqual(OUTFIT_DESCRIPTION_FIELDS, ["description", "page_number"]);
});

test("canonical outfit contract constrains control and CS semantics", () => {
  for (const category of ["armor", "vehicle"]) assert.equal(outfitSupportsControl(category), true);
  for (const category of ["weapon", "cyberware", "tron", "residence", "other"]) assert.equal(outfitSupportsControl(category), false);

  for (const category of ["tron", "vehicle"]) assert.equal(outfitSupportsCsModifier(category), true);
  for (const category of ["weapon", "armor", "cyberware", "residence", "other"]) assert.equal(outfitSupportsCsModifier(category), false);
});

test("canonical outfit contract keeps category-specific performance fields", () => {
  assert.ok(outfitPerformanceFields("weapon").includes("attack"));
  assert.ok(outfitPerformanceFields("armor").includes("defense_s"));
  assert.ok(outfitPerformanceFields("tron").includes("cs_modifier"));
  assert.ok(outfitPerformanceFields("vehicle").includes("control_modifier"));
  assert.ok(outfitPerformanceFields("residence").includes("residence_entry"));
});

test("legacy control and CS detail aliases are read-only compatibility fields", () => {
  assert.deepEqual(OUTFIT_LEGACY_READ_ONLY_DETAIL_FIELDS, ["control_value", "cs_value"]);
});
