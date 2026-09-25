import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyStyleAttributeVisibility,
  applyCharacterToEditor
} from "../js/sheet-character-application.js";

test("style attribute visibility preserves the existing ウツワ behavior", () => {
  const wrap = { hidden: true };
  const select = { value: "旧属性" };
  const style = { value: "ウツワ" };
  const elements = new Map([
    ["#style-1-attribute-wrap", wrap],
    ["#style-1-attribute", select],
    ["#style-1", style]
  ]);
  const root = { querySelector: selector => elements.get(selector) || null };

  assert.equal(applyStyleAttributeVisibility({ root, index: 1 }), true);
  assert.equal(wrap.hidden, false);
  assert.equal(select.value, "旧属性");

  style.value = "カブキ";
  assert.equal(applyStyleAttributeVisibility({ root, index: 1 }), true);
  assert.equal(wrap.hidden, true);
  assert.equal(select.value, "");
});

test("character application keeps the existing load order", () => {
  const calls = [];
  const root = { querySelector: () => null };
  const styleBaseline = {};
  const callback = name => payload => {
    calls.push([name, payload]);
  };

  assert.equal(applyCharacterToEditor({
    root,
    data: { id: "TNX-TEST" },
    structuredFields: ["field"],
    abilities: [["reason"]],
    styleBaseline,
    applyCharacterInputSnapshot: callback("character"),
    applyStyleInputSnapshot: callback("style"),
    applyAbilityInputSnapshot: callback("ability"),
    calculateBaselines: () => calls.push(["baselines"]),
    updateDivines: value => calls.push(["divines", value])
  }), true);

  assert.deepEqual(calls.map(([name]) => name), [
    "character", "style", "baselines", "ability", "divines"
  ]);
  assert.deepEqual(calls[4], ["divines", false]);
});

test("sheet.js delegates character application and style attribute ownership", async () => {
  const sheet = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  const application = await readFile(new URL("../js/sheet-character-application.js", import.meta.url), "utf8");
  assert.match(sheet, /sheet-character-application\.js\?v=1/);
  assert.match(sheet, /applyCharacterToEditor\(/);
  assert.match(sheet, /applyStyleAttributeVisibility/);
  assert.doesNotMatch(sheet, /function toggleAttribute\s*\(/);
  assert.match(application, /applyStyleAttributeVisibility/);
  assert.match(application, /applyCharacterToEditor/);
});
