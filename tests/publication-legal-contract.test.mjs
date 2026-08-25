import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const RIGHTS = "(C)FarEast Amusement Research Co.,Ltd.／(C)GameField Co.,Ltd.";
const SOURCE = "https://character-sheets.appspot.com/tnx/";

test("shared legal notices are loaded by the site-wide theme bootstrap", async () => {
  const source = await read("js/theme-scope.js");
  assert.match(source, /import\(["']\.\/legal-notices\.js\?v=1["']\)/);
});

test("legal center contains unofficial status, current rights notice, terms and privacy policy", async () => {
  const source = await read("js/legal-notices.js");
  assert.ok(source.includes("非公式ファンツール"));
  assert.ok(source.includes("各権利者による公式サービスではありません"));
  assert.ok(source.includes(RIGHTS));
  assert.ok(source.includes("利用規約"));
  assert.ok(source.includes("プライバシーポリシー"));
  assert.ok(source.includes("Supabase"));
});

test("signup requires explicit terms and privacy consent in markup and handler", async () => {
  const [html, js] = await Promise.all([read("login.html"), read("js/login.js")]);
  assert.match(html, /id="signup-legal-consent"[^>]*type="checkbox"[^>]*required|type="checkbox"[^>]*id="signup-legal-consent"[^>]*required/);
  assert.ok(html.includes('data-open-legal="terms"'));
  assert.ok(html.includes('data-open-legal="privacy"'));
  assert.match(js, /#signup-legal-consent/);
  assert.match(js, /if \(!consent\?\.checked\)/);
});

test("image upload warning requires users to hold usage and publication rights", async () => {
  const source = await read("js/legal-notices.js");
  assert.ok(source.includes("自身が使用・公開する権利を有する画像のみ登録してください"));
  assert.ok(source.includes("公式画像や第三者の著作物"));
});

test("character-sheet repository attribution is present for import and transfer", async () => {
  const [legal, transfer] = await Promise.all([read("js/legal-notices.js"), read("transfer.html")]);
  for (const source of [legal, transfer]) {
    assert.ok(source.includes("トーキョーN◎VA THE AXLERATION Cast Profile DataBase"));
    assert.ok(source.includes("キャラクターシート倉庫"));
    assert.ok(source.includes(SOURCE));
  }
  assert.ok(legal.includes("提携・承認・運営上の関係"));
  assert.ok(legal.includes("投稿者・作成者"));
});

test("SKD/OFC TSV import controls are removed at runtime while other import/transfer features remain", async () => {
  const source = await read("js/legal-notices.js");
  assert.match(source, /querySelector\(["']#import-skd["']\)\?\.remove\(\)/);
  assert.match(source, /querySelector\(["']#import-ofc["']\)\?\.remove\(\)/);
  assert.match(source, /querySelector\(["']#tsv-dialog["']\)\?\.remove\(\)/);
  assert.ok(source.includes("#legacy-import-open"));
  assert.ok(source.includes(".transfer-page"));
});

test("archive carries a correct static rights notice before JavaScript enhancement", async () => {
  const source = await read("index.html");
  assert.ok(source.includes("非公式ファンツール"));
  assert.ok(source.includes(RIGHTS));
  assert.doesNotMatch(source, /©鈴吹太郎／F\.E\.A\.R\. ©KADOKAWA/);
});
