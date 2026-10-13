import assert from "node:assert/strict";
import test from "node:test";
import { OUTFIT_SCHEMAS } from "../js/cast-view-definitions.js";

// The editor already puts 参照P before 解説 (outfit-tables.js); the public viewer follows the same order.
test("every outfit category in the viewer ends with 参照P then 解説", () => {
  for (const [category, schema] of Object.entries(OUTFIT_SCHEMAS)) {
    assert.deepEqual(schema.slice(-3), ["slot", "page_number", "description"], category);
  }
});
