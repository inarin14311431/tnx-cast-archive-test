import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("acts.html", "utf8");
const entry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const css = fs.readFileSync("css-next/pages/acts-polish.css", "utf8");
const spending = fs.readFileSync("js/acts-spending.js", "utf8");

test("open act record has a distinct neon active state", () => {
  assert.match(entry, /acts-polish\.css\?v=1/);
  assert.match(css, /\.act-record\.is-detail-open/);
  assert.match(css, /ACTIVE RECORD/);
  assert.match(css, /border:\s*2px solid/);
  assert.match(css, /box-shadow:/);
  assert.match(css, /\.act-year-group\.is-expanded/);
});

test("spending cast select omits player name and normalizes handle quotes", () => {
  assert.doesNotMatch(spending, /formatFullName\(character\)\} \/ \$\{displayPlayer/);
  assert.match(spending, /TNXHandleFormat\?\.formatIdentity/);
  assert.match(spending, /candidates\.map\(character => `<option[^`]+formatFullName\(character\)/s);
});

test("spending deletion verifies returned deleted row", () => {
  assert.match(spending, /\.delete\(\)[\s\S]*\.eq\("id", spendingId\)[\s\S]*\.select\("id"\)/);
  assert.match(spending, /const deleted = Array\.isArray\(data\)/);
  assert.match(spending, /削除対象を確認できませんでした/);
});

test("spending records are ordered date cast exp description delete", () => {
  const date = spending.indexOf('experience-spending-record__date');
  const cast = spending.indexOf('experience-spending-record__cast');
  const amount = spending.indexOf('experience-spending-record__amount');
  const description = spending.indexOf('experience-spending-record__description');
  const remove = spending.indexOf('experience-spending-record__delete');
  assert.ok(date >= 0 && date < cast && cast < amount && amount < description && description < remove);
  assert.match(css, /grid-template-columns:\s*118px minmax\(180px, \.95fr\) 112px minmax\(220px, 1\.5fr\) auto/);
  assert.match(css, /@media \(max-width: 800px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
});

test("acts page cache-busts spending module and entry stylesheet", () => {
  assert.match(html, /acts-entry\.css\?v=9/);
  assert.match(html, /acts-spending\.js\?v=4/);
});
