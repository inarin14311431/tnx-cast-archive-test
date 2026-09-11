import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pcSheet = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
const mobileSkills = await readFile(new URL("../js/sheet-mobile-skills.js", import.meta.url), "utf8");
const mobileOutfit = await readFile(new URL("../js/sheet-mobile-outfit.js", import.meta.url), "utf8");

function importedVersion(source, moduleName) {
  const escaped = moduleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`["']\\./${escaped}\\?v=([^"']+)["']`));
  return match?.[1] || "";
}

test("PC/mobile shared general-skill catalog uses one version", () => {
  assert.equal(importedVersion(pcSheet, "general-skill-catalog.js"), "1");
  assert.equal(importedVersion(mobileSkills, "general-skill-catalog.js"), "1");
});

test("PC/mobile shared row collection state uses one version", () => {
  assert.equal(importedVersion(pcSheet, "sheet-row-collection-state.js"), "2");
  assert.equal(importedVersion(mobileSkills, "sheet-row-collection-state.js"), "2");
  assert.equal(importedVersion(mobileOutfit, "sheet-row-collection-state.js"), "2");
});
