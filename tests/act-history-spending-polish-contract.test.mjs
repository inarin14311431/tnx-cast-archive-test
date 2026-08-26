import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("acts.html", "utf8");
const entry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const css = fs.readFileSync("css-next/pages/acts-polish.css", "utf8");
const detailCss = fs.readFileSync("css-next/pages/acts-detail-grid.css", "utf8");
const spending = fs.readFileSync("js/acts-spending.js", "utf8");
const spendingDelete = fs.readFileSync("js/acts-spending-delete-fix.js", "utf8");
const uiFixes = fs.readFileSync("js/acts-ui-fixes.js", "utf8");
const migration = fs.readFileSync("supabase/30_delete_owned_experience_spending.sql", "utf8");

test("open act record keeps neon focus without an ACTIVE RECORD badge", () => {
  assert.match(entry, /acts-polish\.css\?v=2/);
  assert.match(entry, /acts-detail-grid\.css\?v=1/);
  assert.match(css, /\.act-record\.is-detail-open/);
  assert.match(css, /border:\s*3px solid/);
  assert.match(css, /box-shadow:/);
  assert.match(detailCss, /\.act-record\.is-detail-open::before\s*\{[\s\S]*content:\s*none/s);
});

test("open record exposes showcase affordance and normalizes ruler label", () => {
  assert.match(html, /acts-ui-fixes\.js\?v=2/);
  assert.match(uiFixes, /replace\(\/\^\\s\*RULER/);
  assert.match(uiFixes, /has-showcase-link/);
  assert.match(uiFixes, /act-record__showcase-link/);
  assert.match(css, /OPEN ACT FILE/);
});

test("expanded act detail uses four facts in a two-column two-row grid", () => {
  assert.match(uiFixes, /参加日時 DATE/);
  assert.match(uiFixes, /ハンドアウト CAST No\./);
  assert.match(uiFixes, /スタイル ASSIGN STYLE/);
  assert.match(uiFixes, /ルーラー RULER/);
  assert.match(detailCss, /\.act-record__facts[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(detailCss, /\.act-record\.is-detail-open \.act-record__meta,[\s\S]*\.act-record__role,[\s\S]*act-record__ruler[\s\S]*display:\s*none/s);
});

test("experience reward panel is shortened for the two-row fact layout", () => {
  assert.match(detailCss, /\.act-record\.is-detail-open \.act-record__exp label\s*\{[\s\S]*min-height:\s*82px/s);
  assert.match(detailCss, /font-size:\s*clamp\(1\.9rem, 4vw, 3rem\)/);
});

test("spending cast select omits player name and normalizes handle quotes", () => {
  assert.doesNotMatch(spending, /formatFullName\(character\)\} \/ \$\{displayPlayer/);
  assert.match(spending, /TNXHandleFormat\?\.formatIdentity/);
  assert.match(spending, /candidates\.map\(character => `<option[^`]+formatFullName\(character\)/s);
});

test("spending deletion uses an owner-scoped RPC", () => {
  assert.match(html, /acts-spending-delete-fix\.js\?v=1/);
  assert.match(spendingDelete, /event\.stopImmediatePropagation\(\)/);
  assert.match(spendingDelete, /supabase\.rpc\("delete_owned_experience_spending"/);
  assert.match(spendingDelete, /p_spending_id:\s*spendingId/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /c\.owner_id = v_user_id/);
  assert.match(migration, /grant execute on function public\.delete_owned_experience_spending\(bigint\) to authenticated/);
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

test("acts page cache-busts updated detail and spending modules", () => {
  assert.match(html, /acts-entry\.css\?v=11/);
  assert.match(html, /acts-spending\.js\?v=6/);
  assert.match(html, /acts-spending-delete-fix\.js\?v=1/);
});
