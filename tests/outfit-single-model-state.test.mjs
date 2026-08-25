import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildOutfitSavePayloads } from "../js/sheet-save-payload.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("canonical outfit save payload is built directly from the editor model", () => {
  const [payload] = buildOutfitSavePayloads([{
    category: "armor",
    name: "テスト防具",
    purchase_value: "15",
    experience_cost: 5,
    concealment: "12",
    concealment_penalty: "-1",
    slot: "スーツ",
    control_modifier: -2,
    electronic_control: "18",
    defense_s: "3",
    defense_p: "4",
    defense_i: "2",
    manufacturer: "千早重工",
    page_number: "123",
    description: "テスト",
    _ofc_details: { retained_extension: "keep" }
  }]);

  assert.equal(payload.defense, "");
  assert.equal(payload.control_modifier, -2);
  assert.equal(payload.electronic_control, "18");
  assert.equal(payload.ofc_details.defense_s, "3");
  assert.equal(payload.ofc_details.defense_p, "4");
  assert.equal(payload.ofc_details.defense_i, "2");
  assert.equal(payload.ofc_details.manufacturer, "千早重工");
  assert.equal(payload.ofc_details.page_number, "123");
  assert.equal(payload.ofc_details.retained_extension, "keep");
});

test("save persistence no longer scrapes or enriches outfit DOM state", async () => {
  const source = await read("js/sheet-save-persistence.js");
  assert.doesNotMatch(source, /outfit-ofc-save|enrichOutfitPayload/);
  assert.match(source, /p_outfits:\s*Array\.isArray\(outfits\) \? outfits : \[\]/);
});

test("OFC compatibility facade no longer owns a duplicate state cache", async () => {
  const source = await read("js/outfit-ofc-fields.js");
  assert.doesNotMatch(source, /stateByKey|restoreQueues|MutationObserver|snapshotDetailQueues|enhanceTables/);
  assert.match(source, /Compatibility facade only\. Runtime outfit state is owned by sheet\.js `outfits`/);
  assert.match(source, /globalThis\.TNXOutfitOFCState/);
});
