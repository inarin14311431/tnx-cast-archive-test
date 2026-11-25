import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { manualCastFieldsFromCanonical } from "../js/showcase-manual-sheet-import.js";
import { formatReading } from "../js/showcase-output-html.js";
import { splitReading } from "../js/act-poster-layout.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the warehouse import brings the readings", () => {
  const fields = manualCastFieldsFromCanonical({ basic: { handle: "青", handle_kana: "ブルー", character_name: "夜明け", character_kana: "ヨアケ" } });
  assert.equal(fields.handleKana, "ブルー");
  assert.equal(fields.nameKana, "ヨアケ");
  assert.equal(manualCastFieldsFromCanonical({ basic: { character_name: "夜明け" } }).handleKana, "");
});

test("the card reading of a manual cast is the same text as a registered one, and empty without readings", () => {
  assert.equal(formatReading({ handle_kana: "ブルー", character_kana: "ヨアケ ノ ランナー" }), "“ブルー” ヨアケ ノ ランナー");
  assert.equal(formatReading({ handle_kana: "", character_kana: "" }), "");
  const source = read("js/showcase-output-html.js");
  assert.ok(!/item\.manual\s*\?\s*""\s*:\s*formatReading/.test(source), "a manual cast is not excluded from the reading");
});

test("the published reading goes back to the two fields without losing either part", () => {
  const reading = formatReading({ handle_kana: "ブルー", character_kana: "ヨアケ ノ ランナー" });
  assert.deepEqual(splitReading(reading), { handleReading: "ブルー", nameReading: "ヨアケ ノ ランナー" });
  assert.deepEqual(splitReading(formatReading({ handle_kana: "", character_kana: "ヨアケ" })), { handleReading: "", nameReading: "ヨアケ" });
  assert.deepEqual(splitReading(""), { handleReading: "", nameReading: "" });
});

test("the add form, the row panel, the table of fields, restore and copy all know the readings", () => {
  const html = read("showcase-generator.html");
  assert.match(html, /data-manual-new="handleKana"/);
  assert.match(html, /data-manual-new="nameKana"/);
  const generator = read("js/showcase-generator-v3.js");
  assert.match(generator, /"manual-handle-kana": "handle_kana"/);
  assert.match(generator, /"manual-name-kana": "character_kana"/);
  assert.match(generator, /handle_kana: fields\.handleKana \?\? ""/);
  assert.match(generator, /character_kana: fields\.nameKana \?\? ""/);
  const restore = read("js/showcase-edit-restore.js");
  assert.match(restore, /manual-handle-kana/);
  assert.match(restore, /manual-name-kana/);
});
