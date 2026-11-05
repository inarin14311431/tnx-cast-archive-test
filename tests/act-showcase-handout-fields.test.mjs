import test from "node:test";
import assert from "node:assert/strict";
import { FIELD_DEFS, handoutFacts, parsePackedFields, splitCastName, splitHandoutTitle } from "../js/act-showcase-handout-fields.js";

// js/act-showcase-handout-fields.js: the pure reading of a handout for the HANDOUT / ASSIGN pattern B (docs/ACT_SHOWCASE_SCENES.md §6 #7).

test("parsePackedFields: 項目名と値を取り出す(区切りは空白・全角空白・記号。値の前後の区切りは落とす)", () => {
  assert.deepEqual(parsePackedFields("コネ：千早雅之　推奨スート：情熱"), [
    { key: "connection", label: "CONNECTION", value: "千早雅之" },
    { key: "suit", label: "SUIT", value: "情熱" }
  ]);
  assert.deepEqual(parsePackedFields("推奨スタイル:カブキ ・ 推奨設定: 夜の街").map(field => [field.key, field.value]), [["style", "カブキ"], ["setting", "夜の街"]]);
  assert.deepEqual(parsePackedFields("消えたデータの痕跡を追う。"), []);
  assert.deepEqual(parsePackedFields(""), []);
  assert.deepEqual(parsePackedFields("コネ："), []);
});

test("handoutFacts: コネ → スート → 関係 … の順に、最初の値だけを最大3つ。スタイルは含めない。無い項目は作らない", () => {
  const body = "推奨スタイル：カブキ\nコネ：千早雅之　推奨スート：情熱\nコネ：二つ目は無視\n関係：旧友\n推奨設定：夜の街";
  assert.deepEqual(handoutFacts(body).map(fact => [fact.label, fact.value]), [["CONNECTION", "千早雅之"], ["SUIT", "情熱"], ["RELATION", "旧友"]]);
  assert.deepEqual(handoutFacts(body, { limit: 1 }).map(fact => fact.key), ["connection"]);
  assert.deepEqual(handoutFacts("自由な文章だけ"), []);
  assert.deepEqual(handoutFacts(null), []);
  const long = handoutFacts(`コネ：${"あ".repeat(60)}`, { length: 10 })[0].value;
  assert.equal(Array.from(long).length, 11);
  assert.ok(long.endsWith("…"));
});

test("FIELD_DEFS は、A の読み取り(act-showcase-writing-patterns.js)と同じ項目名を持つ", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../js/act-showcase-writing-patterns.js", import.meta.url), "utf8");
  for (const def of FIELD_DEFS) {
    assert.ok(source.includes(`key: "${def.key}", label: "${def.label}"`), def.key);
    for (const name of def.names) assert.ok(source.includes(`"${name}"`), name);
  }
});

test("splitHandoutTitle: 『…』用ハンドアウト は主題と見出し、それ以外は全部が主題", () => {
  assert.deepEqual(splitHandoutTitle("『カブキ』用ハンドアウト"), { subject: "カブキ", caption: "用ハンドアウト" });
  assert.deepEqual(splitHandoutTitle("カブキ用ハンドアウト"), { subject: "カブキ", caption: "用ハンドアウト" });
  assert.deepEqual(splitHandoutTitle("自由な題"), { subject: "自由な題", caption: "" });
  assert.deepEqual(splitHandoutTitle("用ハンドアウト"), { subject: "用ハンドアウト", caption: "" });
});

test("splitCastName: 引用符つきのハンドルと名前に分ける。ハンドルが無ければ全部が名前", () => {
  assert.deepEqual(splitCastName("“ブルー・モーメント” 夜明けのランナー"), { handle: "“ブルー・モーメント”", name: "夜明けのランナー" });
  assert.deepEqual(splitCastName("「通り名」  本名  太郎"), { handle: "「通り名」", name: "本名 太郎" });
  assert.deepEqual(splitCastName("名前だけ"), { handle: "", name: "名前だけ" });
  assert.deepEqual(splitCastName(undefined), { handle: "", name: "" });
  assert.deepEqual(splitCastName("“ハンドルだけ”"), { handle: "“ハンドルだけ”", name: "" });
});
