import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../act-showcase-standard.html", import.meta.url), "utf8");
const css = await readFile(new URL("../css-next/pages/act-showcase-standard.css", import.meta.url), "utf8");

test("standard ACT showcase does not paint the loading label over the TOP hero", () => {
  assert.match(
    html,
    /<div id="act-showcase-standard-status" class="showcase-loading" hidden>アクト紹介を読み込み中…<\/div>/
  );
  assert.match(html, /<div id="act-showcase-standard-root" hidden>/);
});

test("standard ACT showcase can still expose an error state when loading fails", () => {
  assert.match(css, /\.showcase-loading\.is-error\{[^}]*display:grid/);
  assert.match(css, /\.showcase-loading\.is-error\{[^}]*color:#ff8fbf/);
});
