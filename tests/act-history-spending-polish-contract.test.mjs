import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("acts.html", "utf8");
const entry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const css = fs.readFileSync("css-next/pages/acts-polish.css", "utf8");
const detailCss = fs.readFileSync("css-next/pages/acts-detail-grid.css", "utf8");
const roundedCss = fs.readFileSync("css-next/pages/acts-rounded-polish.css", "utf8");
const spending = fs.readFileSync("js/acts-spending.js", "utf8");
const uiFixes = fs.readFileSync("js/acts-ui-fixes.js", "utf8");
const migration = fs.readFileSync("supabase/09_experience_spending.sql", "utf8");

test("open act record keeps neon focus without an ACTIVE RECORD badge", () => {
  assert.match(entry, /acts-polish\.css\?v=2/);
  assert.match(entry, /acts-detail-grid\.css\?v=1/);
  assert.match(entry, /acts-rounded-polish\.css\?v=1/);
  assert.match(css, /\.act-record\.is-detail-open/);
  assert.match(css, /border:\s*3px solid/);
  assert.match(detailCss, /\.act-record\.is-detail-open::before\s*\{[\s\S]*content:\s*none/s);
  assert.match(roundedCss, /border-radius:\s*16px/);
  assert.match(roundedCss, /border-radius:\s*999px/);
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
});

test("experience reward panel is shortened for the two-row fact layout", () => {
  assert.match(detailCss, /\.act-record\.is-detail-open \.act-record__exp label\s*\{[\s\S]*min-height:\s*82px/s);
  assert.match(detailCss, /font-size:\s*clamp\(1\.9rem, 4vw, 3rem\)/);
});

test("spending cast select omits player name and normalizes handle quotes", () => {
  assert.doesNotMatch(spending, /formatFullName\(character\)\} \/ \$\{displayPlayer/);
  assert.match(spending, /TNXHandleFormat\?\.formatIdentity/);
});

test("spending deletion uses one canonical handler with confirmation", () => {
  assert.match(html, /acts-spending\.js\?v=7/);
  assert.doesNotMatch(html, /acts-spending-delete-fix/);
  assert.match(spending, /window\.confirm/);
  assert.match(spending, /この操作は元に戻せません/);
  assert.match(spending, /\.from\("character_experience_spending"\)[\s\S]*\.delete\(\)[\s\S]*\.eq\("id", row\.id\)[\s\S]*\.eq\("character_id", ownedCharacter\.id\)/s);
  assert.doesNotMatch(spending, /delete_owned_experience_spending/);
});

test("spending deletion is owner-scoped by RLS", () => {
  assert.match(migration, /create policy experience_spending_select_owner/i);
  assert.match(migration, /create policy experience_spending_delete_owner/i);
  assert.match(migration, /c\.owner_id = auth\.uid\(\)/i);
  assert.match(migration, /grant select, insert, update, delete on table public\.character_experience_spending to authenticated/i);
});

test("spending records keep rounded delete treatment", () => {
  const date = spending.indexOf('experience-spending-record__date');
  const cast = spending.indexOf('experience-spending-record__cast');
  const amount = spending.indexOf('experience-spending-record__amount');
  const description = spending.indexOf('experience-spending-record__description');
  const remove = spending.indexOf('experience-spending-record__delete');
  assert.ok(date >= 0 && date < cast && cast < amount && amount < description && description < remove);
  assert.match(roundedCss, /\.experience-spending-record\s*\{[\s\S]*border-radius:\s*13px/s);
  assert.match(roundedCss, /\.experience-spending-record__delete\s*\{[\s\S]*border-radius:\s*999px/s);
});
