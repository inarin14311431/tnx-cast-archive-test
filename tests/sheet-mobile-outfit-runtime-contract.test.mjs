import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-mobile-outfit.js", import.meta.url), "utf8");
const model = await readFile(new URL("../js/sheet-mobile-outfit-model.js", import.meta.url), "utf8");
const ui = await readFile(new URL("../js/sheet-mobile-outfit-ui.js", import.meta.url), "utf8");

test("mobile outfit uses shared editor context instead of independent auth lookup", () => {
  assert.match(source, /getMobileEditorContext/);
  assert.doesNotMatch(source, /requireAuth/);
  assert.doesNotMatch(source, /from\(["']characters["']\)/);
});

test("mobile outfit keeps save coordinator contract", () => {
  assert.match(source, /tnx:mobile-before-save/);
  assert.match(source, /character_outfits/);
});

test("mobile outfit keeps category rules in model and UI owners", () => {
  assert.match(model, /RANGE_OPTIONS/);
  assert.match(model, /SLOT_OPTIONS/);
  assert.match(model, /CONTROL_OPTIONS/);
  assert.match(model, /function parseConcealment/);
  assert.match(model, /function parseDefense/);
  assert.match(ui, /function performanceFields/);
  assert.match(ui, /case "armor"/);
  assert.match(ui, /case "tron"/);
  assert.match(ui, /case "vehicle"/);
});

test("mobile outfit persists split concealment and does not create legacy control detail", () => {
  assert.match(model, /concealment_penalty:/);
  assert.doesNotMatch(model, /return mod \? `\$\{value\}\/\$\{mod\}` : value/);
  assert.doesNotMatch(source, /ofc_details\.control_value\s*=/);
  assert.doesNotMatch(model, /detailsSource\.control_value\s*=/);
});
