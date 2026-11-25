import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = (await readFile(new URL("../js/tnx-transfer-bookmarklet-fixes.js", import.meta.url), "utf8")).replaceAll(String.fromCharCode(13), "");
const start = source.indexOf("  const PK_VALUES=");
const end = source.indexOf("  async function repairStyles(records)");
const normalizeStart = source.indexOf("  function normalizeMark");
assert.ok(normalizeStart >= 0 && start > normalizeStart && end > start);
const body = source.slice(normalizeStart, end);

function run(marks, before = ["", "", ""]) {
  const controls = Object.fromEntries(before.map((value, index) => [`styles.pk${index + 1}`, { value }]));
  let styleChanges = 0;
  controls["ability.reason.abl"] = { value: "9" };
  controls["ability.cs"] = { value: "12" };
  vm.runInNewContext(`${body}; repairStyleMarks(list);`, {
    list: marks.map(mark => ({ mark })),
    clean: value => String(value ?? "").trim(),
    notify() {},
    document: { getElementById: id => controls[id] || null },
    window: { styleChange: () => { styleChanges += 1; controls["ability.reason.abl"].value = "4"; controls["ability.cs"].value = "1"; } }
  });
  assert.equal(controls["ability.reason.abl"].value, "9", "redrawing the marks must keep the transferred abilities");
  assert.equal(controls["ability.cs"].value, "12");
  return { values: [1, 2, 3].map(index => controls[`styles.pk${index}`].value), styleChanges };
}

test("persona and key marks map to the sheet's pk values and redraw once", () => {
  assert.deepEqual(run(["◎", "●", ""]), { values: ["2", "1", ""], styleChanges: 1 });
  assert.deepEqual(run(["", "◎●", ""]), { values: ["", "3", ""], styleChanges: 1 });
});

test("an update replaces moved marks but does not redraw when nothing changed", () => {
  assert.deepEqual(run(["◎", "●", ""], ["1", "", "2"]), { values: ["2", "1", ""], styleChanges: 1 });
  assert.deepEqual(run(["◎", "●", ""], ["2", "1", "0"]), { values: ["2", "1", "0"], styleChanges: 0 });
});

test("a cast without any mark leaves the sheet's marks alone", () => {
  assert.deepEqual(run(["", "", ""], ["3", "", ""]), { values: ["3", "", ""], styleChanges: 0 });
});
