import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { initSheetActionBindings } from "../js/sheet-action-bindings.js";

test("sheet action bindings assign each editor action once", () => {
  const elements = new Map([
    ["#save-button", {}],
    ["#add-general", {}],
    ["#add-social", {}],
    ["#add-connection", {}],
    ["#add-style-skill", {}],
    ["#add-outfit", {}]
  ]);
  const root = {
    querySelector(selector) {
      return elements.get(selector) || null;
    }
  };
  const calls = [];
  const options = {
    root,
    onSave: () => calls.push("save"),
    onAddGeneral: () => calls.push("general"),
    onAddSocial: () => calls.push("social"),
    onAddConnection: () => calls.push("connection"),
    onAddStyleSkill: () => calls.push("style"),
    onAddOutfit: () => calls.push("outfit")
  };

  assert.equal(initSheetActionBindings(options), true);
  assert.equal(initSheetActionBindings(options), false);

  for (const [selector, element] of elements) {
    assert.equal(typeof element.onclick, "function", selector);
    element.onclick();
  }
  assert.deepEqual(calls, ["save", "general", "social", "connection", "style", "outfit"]);
});

test("missing editor action elements are tolerated", () => {
  const root = { querySelector: () => null };
  assert.equal(initSheetActionBindings({ root }), true);
});

test("sheet delegates action button ownership to the action binding module", async () => {
  const source = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.match(source, /sheet-action-bindings\.js\?v=1/);
  assert.match(source, /initSheetActionBindings\(/);
  assert.doesNotMatch(source, /\$\("#save-button"\)\.onclick/);
  assert.doesNotMatch(source, /\$\("#add-general"\)\.onclick/);
  assert.doesNotMatch(source, /\$\("#add-style-skill"\)\.onclick/);
});
