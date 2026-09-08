import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("showcase loads the writing-pattern layer last", async () => {
  const html = await read("act-showcase.html");
  assert.match(html, /act-showcase-story-flow\.css[^\n]+act-showcase-writing-patterns\.css/s);
  assert.match(html, /act-showcase-story-flow\.js[^\n]+act-showcase-writing-patterns\.js/s);
});

test("handout parser accepts common N◎VA metadata variants", async () => {
  const js = await read("js/act-showcase-writing-patterns.js");
  for (const label of [
    "推奨スタイル",
    "推奨設定",
    "コネ",
    "推奨スート",
    "クイックスタート",
    "条件",
    "キャスト間コネ",
    "関係",
    "ＰＳ",
    "使命"
  ]) assert.match(js, new RegExp(label));
  assert.match(js, /parsePackedFields/);
  assert.match(js, /firstNarrativeHook/);
  assert.match(js, /structured/);
  assert.match(js, /mixed/);
  assert.match(js, /prose/);
  assert.match(js, /compact/);
});

test("trailer patterns preserve author line breaks and adapt typography", async () => {
  const js = await read("js/act-showcase-writing-patterns.js");
  const css = await read("css-next/pages/act-showcase-writing-patterns.css");
  assert.match(js, /data.*trailerPattern|dataset\.trailerPattern/);
  for (const pattern of ["verse", "prose", "compact", "hybrid"]) {
    assert.match(js, new RegExp(`\\"${pattern}\\"`));
    assert.match(css, new RegExp(`data-trailer-pattern=\\"${pattern}\\"`));
  }
  assert.match(css, /white-space:pre-wrap/);
});

test("title override remains responsive without important declarations", async () => {
  const css = await read("css-next/pages/act-showcase-writing-patterns.css");
  assert.match(css, /font-size:clamp\(5\.6rem,8\.6vw,10\.2rem\)/);
  assert.match(css, /data-fit=\"medium\"/);
  assert.match(css, /data-fit=\"long\"/);
  assert.match(css, /data-fit=\"xlong\"/);
  assert.doesNotMatch(css, /!important/);
});
