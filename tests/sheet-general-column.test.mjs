import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chooseGeneralSkillColumn } from "../js/sheet-general-column.js";

test("equal counts choose left", () => {
  assert.equal(chooseGeneralSkillColumn({ left: 10, right: 10 }), "left");
});

test("fewer left rows choose left", () => {
  assert.equal(chooseGeneralSkillColumn({ left: 8, right: 9 }), "left");
});

test("fewer right rows choose right", () => {
  assert.equal(chooseGeneralSkillColumn({ left: 11, right: 9 }), "right");
});

test("missing and string counts are normalized", () => {
  assert.equal(chooseGeneralSkillColumn(), "left");
  assert.equal(chooseGeneralSkillColumn({ left: "12", right: "11" }), "right");
});

test("general column helper stays DOM-free and sheet delegates the decision", async () => {
  const helperSource = await readFile(new URL("../js/sheet-general-column.js", import.meta.url), "utf8");
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.doesNotMatch(helperSource, /document\.|window\.|supabase|localStorage|sessionStorage|addEventListener/);
  assert.match(sheetSource, /sheet-general-column\.js\?v=1/);
  assert.match(sheetSource, /chooseGeneralSkillColumn\(counts\)/);
  assert.doesNotMatch(sheetSource, /counts\.left <= counts\.right \? "left" : "right"/);
});
