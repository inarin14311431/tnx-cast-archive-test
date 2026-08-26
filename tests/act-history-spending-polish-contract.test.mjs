import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("acts.html", "utf8");
const entry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const css = fs.readFileSync("css-next/pages/acts-polish.css", "utf8");
const detailCss = fs.readFileSync("css-next/pages/acts-detail-grid.css", "utf8");
const roundedCss = fs.readFileSync("css-next/pages/acts-rounded-polish.css", "utf8");
const app = fs.readFileSync("js/acts-app.js", "utf8");
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

test("unified controller renders showcase affordance and four detail facts directly", () => {
  assert.match(html, /acts-app\.js\?v=1/);
  assert.match(app, /act-record__showcase-link/);
  assert.match(app, /has-showcase-link/);
  assert.match(app, /参加日時 DATE/);
  assert.match(app, /ハンドアウト CAST No\./);
  assert.match(app, /スタイル ASSIGN STYLE/);
  assert.match(app, /ルーラー RULER/);
  assert.match(detailCss, /\.act-record__facts[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
});

test("experience reward panel is shortened for the two-row fact layout", () => {
  assert.match(detailCss, /\.act-record\.is-detail-open \.act-record__exp label\s*\{[\s\S]*min-height:\s*82px/s);
  assert.match(detailCss, /font-size:\s*clamp\(1\.9rem, 4vw, 3rem\)/);
});

test("spending cast select omits player name and normalizes handle quotes", () => {
  assert.match(app, /TNXHandleFormat\?\.formatIdentity/);
  const body = app.match(/function populateSpendingCharacterOptions\(\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(body, /fullName\(c\)/);
  assert.doesNotMatch(body, /displayPlayer\(/);
});

test("spending deletion uses canonical in-page confirmation and RLS scoped delete", () => {
  assert.match(app, /function confirmAction\(/);
  assert.match(app, /experience-spending-confirm__panel/);
  assert.match(app, /この操作は元に戻せません/);
  assert.doesNotMatch(app, /window\.confirm/);
  assert.match(app, /\.from\("character_experience_spending"\)\.delete\(\)[\s\S]*\.eq\("id", row\.id\)\.eq\("character_id", character\.id\)/s);
  assert.doesNotMatch(app, /delete_owned_experience_spending/);
});

test("spending deletion is owner-scoped by RLS", () => {
  assert.match(migration, /create policy experience_spending_select_owner/i);
  assert.match(migration, /create policy experience_spending_delete_owner/i);
  assert.match(migration, /c\.owner_id = auth\.uid\(\)/i);
  assert.match(migration, /grant select, insert, update, delete on table public\.character_experience_spending to authenticated/i);
});

test("spending records keep rounded delete treatment", () => {
  const date = app.indexOf('experience-spending-record__date');
  const cast = app.indexOf('experience-spending-record__cast');
  const amount = app.indexOf('experience-spending-record__amount');
  const description = app.indexOf('experience-spending-record__description');
  const remove = app.indexOf('experience-spending-record__delete');
  assert.ok(date >= 0 && date < cast && cast < amount && amount < description && description < remove);
  assert.match(roundedCss, /\.experience-spending-record\s*\{[\s\S]*border-radius:\s*13px/s);
  assert.match(roundedCss, /\.experience-spending-record__delete\s*\{[\s\S]*border-radius:\s*999px/s);
});
