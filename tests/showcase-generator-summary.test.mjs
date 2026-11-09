import assert from "node:assert/strict";
import test from "node:test";
import {
  publishBlocker,
  summarizeBackground,
  summarizeCasts,
  summarizeChecklist,
  summarizeScenes,
  summarizeSteps,
  themeShortName
} from "../js/showcase-generator-summary.js";

const casts = (...rows) => summarizeCasts(rows.map(([isPrivate, hasHandout]) => ({ isPrivate, hasHandout })));

test("the composition summary names the frames that are not A", () => {
  assert.equal(summarizeScenes({}), "すべて A(標準)");
  assert.equal(summarizeScenes(undefined), "すべて A(標準)");
  assert.equal(summarizeScenes({ title: "b", ready: "b" }), "B:タイトル・ACT READY / ほかは A");
  assert.equal(summarizeScenes({ finale: "b", title: "c" }), "B:フィナーレ / C:タイトル / ほかは A");
  assert.equal(summarizeScenes({ loading: "b", title: "b", trailer: "b", "handout-assign": "b", ready: "b", finale: "b" }), "すべて B");
  assert.equal(summarizeScenes({ title: "a", ready: "A" }), "すべて A(標準)");
});

test("the theme name is the Japanese part of the option text", () => {
  assert.equal(themeShortName("ネオン・グリッド / NEON GRID"), "ネオン・グリッド");
  assert.equal(themeShortName(""), "");
  assert.equal(themeShortName(undefined), "");
});

test("the background summary names the preset when its key is set (its URL is in the URL field too), then the custom URL, then the file", () => {
  const presets = [{ key: "green-area", name: "グリーンエリア" }];
  assert.equal(summarizeBackground({ url: "https://example.invalid/green-area.avif", presetKey: "green-area", presets }), "グリーンエリア");
  assert.equal(summarizeBackground({ url: "https://example.invalid/a.png", presetKey: "", presets }), "自分の画像(URL)");
  assert.equal(summarizeBackground({ hasFile: true, presetKey: "", presets }), "自分の画像(ファイル)");
  assert.equal(summarizeBackground({ presetKey: "green-area", presets }), "グリーンエリア");
  assert.equal(summarizeBackground({ presetKey: "missing", presets }), "未設定");
  assert.equal(summarizeBackground(), "未設定");
});

test("cast counts: total, handouts, private and public", () => {
  assert.deepEqual(casts([false, true], [false, false], [true, true]), { total: 3, handouts: 2, privateCount: 1, publicCount: 2 });
  assert.deepEqual(summarizeCasts(), { total: 0, handouts: 0, privateCount: 0, publicCount: 0 });
});

test("what stops a publication, in the order to fix it", () => {
  assert.equal(publishBlocker({ actName: "  ", casts: casts([false, true]) }), "アクトタイトルを入力してください");
  assert.equal(publishBlocker({ actName: "A", casts: casts() }), "キャストを選んでください");
  assert.match(publishBlocker({ actName: "A", casts: casts([false, false], [true, false]) }), /非公開キャストを含む/);
  assert.equal(publishBlocker({ actName: "A", casts: casts([false, false]) }), "");
});

test("the step states", () => {
  const ready = summarizeSteps({ actName: "A", themeLabel: "ネオン・グリッド / NEON GRID", casts: casts([false, true], [false, false], [false, true]) });
  assert.deepEqual(ready, { act: "入力済み", cast: "3人・HO 2/3", look: "ネオン・グリッド", publish: "公開できます" });
  const empty = summarizeSteps({ actName: "", themeLabel: "", casts: casts() });
  assert.deepEqual(empty, { act: "未入力", cast: "未選択", look: "未選択", publish: "アクトタイトルを入力してください" });
  assert.equal(summarizeSteps({ actName: "A", casts: casts([true, false]) }).publish, "非公開キャストを含むため公開できません");
});

test("the checklist rows", () => {
  const rows = summarizeChecklist({ actName: "題", rulerName: "", casts: casts([false, true], [false, false]) });
  assert.deepEqual(rows.map(row => [row.key, row.value, row.state]), [
    ["act", "題", "ok"],
    ["ruler", "未入力(任意)", "optional"],
    ["casts", "2 / 6人", "ok"],
    ["handouts", "1 / 2", "optional"]
  ]);
  assert.equal(summarizeChecklist({ actName: "", casts: casts() })[0].state, "todo");
  assert.equal(summarizeChecklist({ actName: "", casts: casts() })[3].state, "todo");
});
