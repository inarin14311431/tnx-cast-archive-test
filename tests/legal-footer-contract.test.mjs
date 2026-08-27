import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const legal = fs.readFileSync("js/legal-notices.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const account = fs.readFileSync("account.html", "utf8");

test("fixed footer remains the single legal navigation surface", () => {
  assert.match(legal, /site-legal-footer/);
  assert.match(legal, /data-open-legal=\"terms\"/);
  assert.match(legal, /data-open-legal=\"privacy\"/);
  assert.match(legal, /data-open-legal=\"contact\"/);
  assert.doesNotMatch(index, /href=\"\.\/privacy\.html\"/);
  assert.doesNotMatch(index, /href=\"\.\/terms\.html\"/);
  assert.doesNotMatch(account, /法務情報\s*<small>LEGAL<\/small>/);
});

test("privacy disclosure reflects current infrastructure and data handling", () => {
  assert.match(legal, /メールアドレス/);
  assert.match(legal, /経験点の獲得・消費履歴/);
  assert.match(legal, /Supabase/);
  assert.match(legal, /GitHub Pages/);
  assert.match(legal, /韓国（ソウル）リージョン/);
  assert.match(legal, /広告配信や行動ターゲティングを目的としたアクセス解析は実施していません/);
  assert.match(legal, /Row Level Security（RLS）/);
});

test("terms retain fan-tool and user-content protections", () => {
  assert.match(legal, /非公式ファンツール/);
  assert.match(legal, /公式画像や第三者の著作物/);
  assert.match(legal, /公開設定にしたデータ/);
  assert.match(legal, /日本法/);
});
