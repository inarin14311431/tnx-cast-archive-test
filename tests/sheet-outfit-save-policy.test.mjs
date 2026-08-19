import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");

function functionBlock(name, nextName) {
  assert.ok(nextName, `${name} block needs an explicit next function boundary`);
  const match = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n}\\n\\n(?:async )?function ${nextName}`));
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

test("classic raw card no longer emits hidden legacy outfit transport fields", () => {
  assert.doesNotMatch(source, /function compatibilityOutfitFields/);
  const block = functionBlock("outfitFields", "renderOutfits");
  assert.doesNotMatch(block, /type="hidden" data-o="defense"/);
  assert.doesNotMatch(block, /type="hidden" data-o="control_modifier"/);
  assert.doesNotMatch(block, /type="hidden" data-o="cs_modifier"/);
  assert.doesNotMatch(block, /data-o="mundane_modifier"/);
});

test("raw editor exposes only canonical category-owned control and CS fields", () => {
  const block = functionBlock("outfitFields", "renderOutfits");
  assert.match(block, /outfit\.category === "armor"[\s\S]*data-o="control_modifier"/);
  assert.match(block, /outfit\.category === "tron"[\s\S]*data-o="cs_modifier"/);
  assert.match(block, /outfit\.category === "vehicle"[\s\S]*data-o="control_modifier"[\s\S]*data-o="cs_modifier"/);
  assert.doesNotMatch(block, /data-o="defense"/);
  assert.doesNotMatch(block, /mundane_modifier/);
});

test("classic sheet collector writes only current category-owned outfit fields", () => {
  assert.doesNotMatch(source, /function legacyOutfitSaveFields/);
  const collect = functionBlock("collectOutfits", "openImport");
  assert.match(collect, /category === "armor"\) payload\.control_modifier/);
  assert.match(collect, /category === "tron"\) payload\.cs_modifier/);
  assert.match(collect, /category === "vehicle"[\s\S]*payload\.control_modifier[\s\S]*payload\.cs_modifier/);
  assert.doesNotMatch(collect, /payload\.defense/);
  assert.doesNotMatch(collect, /mundane_modifier/);
  assert.doesNotMatch(collect, /legacyOutfitSaveFields/);
});

test("classic OFC TSV fallback no longer seeds combined defense", () => {
  const block = functionBlock("applyImport", "jpError");
  assert.doesNotMatch(block, /defense:\s*row\.defense/);
});

test("character control payload remains semantically unchanged by save refactor", () => {
  assert.match(source, /payload\[`\$\{controlKey\.replace\("-", "_"\)\}_manual`\] = 0/);
  assert.match(source, /payload\[`\$\{key\}_control`\] = final\(controlKey\)/);
  assert.doesNotMatch(source, /payload\[`\$\{controlKey\}_manual`\]/);
});
