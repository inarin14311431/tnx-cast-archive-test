import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const privacy = fs.readFileSync("privacy.html", "utf8");
const terms = fs.readFileSync("terms.html", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const account = fs.readFileSync("account.html", "utf8");

test("public archive links privacy policy and terms", () => {
  assert.match(index, /href="\.\/privacy\.html"/);
  assert.match(index, /href="\.\/terms\.html"/);
});

test("account page links privacy policy and terms", () => {
  assert.match(account, /href="\.\/privacy\.html"/);
  assert.match(account, /href="\.\/terms\.html"/);
});

test("privacy policy documents public/private handling and overseas infrastructure", () => {
  assert.match(privacy, /公開情報と非公開情報/);
  assert.match(privacy, /Supabase/);
  assert.match(privacy, /GitHub Pages/);
  assert.match(privacy, /韓国（ソウル）リージョン/);
  assert.match(privacy, /アカウント削除/);
});

test("terms cover user content rights and fan-tool status", () => {
  assert.match(terms, /非公式ファンツール/);
  assert.match(terms, /著作権/);
  assert.match(terms, /公開.*許諾/s);
  assert.match(terms, /日本法/);
});
