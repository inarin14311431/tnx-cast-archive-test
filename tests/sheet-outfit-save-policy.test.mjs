import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");

function functionBlock(name, nextName) {
  const end = nextName ? `function ${nextName}` : "async function saveAll";
  const match = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n}\\n\\n${end}`));
  assert.ok(match, `${name} block should exist`);
  return match[0];
}

test("new outfit state no longer seeds retired compatibility fields", () => {
  const block = functionBlock("blankOutfit", "normalizeOutfit");
  assert.doesNotMatch(block, /defense:/);
  assert.doesNotMatch(block, /control_modifier:/);
  assert.doesNotMatch(block, /cs_modifier:/);
  assert.doesNotMatch(block, /mundane_modifier:/);
});

test("classic raw card keeps legacy values hidden for reorder compatibility", () => {
  const block = functionBlock("compatibilityOutfitFields", "outfitFields");
  assert.match(block, /type="hidden" data-o="defense"/);
  assert.match(block, /type="hidden" data-o="control_modifier"/);
  assert.match(block, /type="hidden" data-o="cs_modifier"/);
  assert.match(block, /type="hidden" data-o="mundane_modifier"/);
});

test("raw editor only exposes control and CS in canonical categories", () => {
  const block = functionBlock("outfitFields", "renderOutfits");
  assert.match(block, /outfit\.category === "armor"[\s\S]*data-o="control_modifier"/);
  assert.match(block, /outfit\.category === "tron"[\s\S]*data-o="cs_modifier"/);
  assert.match(block, /outfit\.category === "vehicle"[\s\S]*data-o="control_modifier"[\s\S]*data-o="cs_modifier"/);
  assert.doesNotMatch(block, /<label>外界<input data-o="mundane_modifier"/);
  assert.doesNotMatch(block, /outfit\.category === "vehicle"[\s\S]*<label>防御<input data-o="defense"/);
});

test("sheet save payload writes canonical modifiers by category and only preserves meaningful legacy values", () => {
  const legacy = functionBlock("legacyOutfitSaveFields", "collectOutfits");
  const collect = functionBlock("collectOutfits", null);
  assert.match(legacy, /category === "vehicle" && defense/);
  assert.match(legacy, /mundaneModifier !== 0/);
  assert.match(legacy, /category !== "armor" && category !== "vehicle" && controlModifier !== 0/);
  assert.match(legacy, /category !== "tron" && category !== "vehicle" && csModifier !== 0/);
  assert.match(collect, /category === "armor"[\s\S]*payload\.control_modifier/);
  assert.match(collect, /category === "tron"\) payload\.cs_modifier/);
  assert.match(collect, /category === "vehicle"[\s\S]*payload\.control_modifier[\s\S]*payload\.cs_modifier/);
  assert.doesNotMatch(collect, /mundane_modifier:\s*Number/);
});

test("character control payload remains unchanged by outfit refactor", () => {
  assert.match(source, /payload\[`\$\{key\}_control`\] = final\(controlKey\)/);
});
