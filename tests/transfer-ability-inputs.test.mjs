import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { transferAbilityInputs } from "../js/transfer-ability-inputs.js";

const character = (overrides = {}) => ({
  style_1: "カブキ", style_2: "カブキ", style_3: "カブキ",
  reason_base: 2, reason_control_base: 10, passion_base: 9, passion_control_base: 15,
  life_base: 6, life_control_base: 12, mundane_base: 6, mundane_control_base: 12,
  ...overrides
});

test("growth is the saved base minus the style totals, gear adds manual", () => {
  const inputs = transferAbilityInputs(character({ passion_gear: 2, passion_manual: 1, cs_gear: -1 }));
  assert.deepEqual(inputs.reason, { up: 2, up_control: 1, gear: 0, gear_control: 0 });
  assert.deepEqual(inputs.passion, { up: 0, up_control: 0, gear: 3, gear_control: 0 });
  assert.deepEqual(inputs.cs, { gear: -1 });
});

test("utsuwa uses its attribute and unknown styles send no inputs", () => {
  assert.equal(transferAbilityInputs(character({ style_3: "" })), null);
  assert.equal(transferAbilityInputs(character({ style_3: "ウツワ" })), null);
  assert.ok(transferAbilityInputs(character({ style_3: "ウツワ", style_3_attribute: "運命神" })));
});

const source = (await readFile(new URL("../js/tnx-transfer-base.js", import.meta.url), "utf8")).replaceAll(String.fromCharCode(13), "");
const start = source.indexOf("  function setAbilityInput(");
const end = source.indexOf("  function findContainer(");
assert.ok(start >= 0 && end > start);

function fill(abilities, values = {}) {
  const ids = ["reason", "passion", "life", "mundane"].flatMap(key => ["up", "outfits"].flatMap(kind => [`ability.${kind}.${key}.abl`, `ability.${kind}.${key}.ctl`]));
  const controls = Object.fromEntries([...ids, "ability.outfits.cs"].map(id => [id, { value: values[id] || "" }]));
  const log = { styleChanges: 0, totals: 0 };
  const context = {
    clean: value => String(value ?? "").trim(), results: { set: 0, missing: 0 },
    setElement: (element, value) => { element.value = String(value); },
    setPath: () => { log.totals += 1; },
    document: { getElementById: id => controls[id] || null },
    window: { styleChange: () => { log.styleChanges += 1; } }, abilities
  };
  vm.runInNewContext(`${source.slice(start, end)}; setAbilities(abilities);`, context);
  return { ...log, get: id => controls[id].value };
}
const row = (extra = {}) => ({ value: "9", control: "9", up: "0", up_control: "0", gear: "0", gear_control: "0", ...extra });

test("growth and gear are written, totals are left to the sheet", () => {
  const result = fill({ reason: row({ up: "2", gear: "1" }), passion: row(), life: row(), mundane: row(), cs: { value: "8", gear: "-1" } });
  assert.equal(result.totals, 0);
  assert.equal(result.styleChanges, 1);
  assert.equal(result.get("ability.up.reason.abl"), "2");
  assert.equal(result.get("ability.outfits.reason.abl"), "1");
  assert.equal(result.get("ability.outfits.cs"), "-1");
});

test("zero growth clears the sheet, zero gear keeps it", () => {
  const result = fill({ reason: row(), passion: row(), life: row(), mundane: row(), cs: { gear: "0" } },
    { "ability.up.reason.abl": "3", "ability.outfits.reason.abl": "2", "ability.outfits.cs": "1" });
  assert.equal(result.get("ability.up.reason.abl"), "");
  assert.equal(result.get("ability.outfits.reason.abl"), "2");
  assert.equal(result.get("ability.outfits.cs"), "1");
});

test("a TSV without growth still writes the totals", () => {
  const old = { value: "9", control: "9" };
  const result = fill({ reason: old, passion: old, life: old, mundane: old, cs: { value: "8" } });
  assert.equal(result.styleChanges, 0);
  assert.ok(result.totals > 0);
});
