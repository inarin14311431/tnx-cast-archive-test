import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("acts.html", "utf8");
const entry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const recordCss = fs.readFileSync("css-next/pages/acts-record.css", "utf8");
const spendingCss = fs.readFileSync("css-next/pages/acts-spending.css", "utf8");
const maintenanceCss = fs.readFileSync("css-next/pages/acts-maintenance.css", "utf8");
const app = fs.readFileSync("js/acts-app.js", "utf8");
const migration = fs.readFileSync("supabase/09_experience_spending.sql", "utf8");

test("expanded ACT record has one canonical stylesheet owner", () => {
  assert.match(entry, /acts-record\.css\?v=1/);
  assert.doesNotMatch(entry, /act-record-console\.css/);
  assert.doesNotMatch(entry, /acts-polish\.css/);
  assert.doesNotMatch(entry, /acts-detail-grid\.css/);
  assert.doesNotMatch(entry, /acts-rounded-polish\.css/);
  assert.match(recordCss, /\.act-record\.is-detail-open/);
  assert.match(recordCss, /grid-template-areas:[\s\S]*"summary summary"[\s\S]*"main exp"[\s\S]*"facts exp"/s);
  assert.match(recordCss, /> \.act-record-summary\s*\{[\s\S]*grid-area:\s*summary[\s\S]*margin:\s*0[\s\S]*width:\s*100%/s);
  assert.doesNotMatch(recordCss, /margin(?:-inline)?:\s*-\d/);
  assert.match(recordCss, /\.act-record\.is-detail-open::before,[\s\S]*content:\s*none/s);
  assert.doesNotMatch(maintenanceCss, /\.act-record\.is-detail-open/);
});

test("unified controller renders showcase affordance and four detail facts directly", () => {
  assert.match(html, /acts-app\.js\?v=1/);
  assert.match(app, /act-record__showcase-link/);
  assert.match(app, /has-showcase-link/);
  assert.match(app, /参加日時 DATE/);
  assert.match(app, /ハンドアウト CAST No\./);
  assert.match(app, /スタイル ASSIGN STYLE/);
  assert.match(app, /ルーラー RULER/);
  assert.match(recordCss, /\.act-record\.is-detail-open > \.act-record__facts\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
});

test("experience reward panel is responsive without overlapping summary", () => {
  assert.match(recordCss, /> \.act-record__exp\s*\{[\s\S]*grid-area:\s*exp/s);
  assert.match(recordCss, /\.act-record__exp label\s*\{[\s\S]*min-height:\s*126px/s);
  assert.match(recordCss, /font:\s*850 clamp\(2\.1rem, 4\.6vw, 3\.4rem\)/);
  assert.match(recordCss, /@media \(max-width:\s*900px\)[\s\S]*"summary"[\s\S]*"main"[\s\S]*"facts"[\s\S]*"exp"/s);
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

test("spending ledger has a separate canonical stylesheet", () => {
  assert.match(entry, /acts-spending\.css\?v=1/);
  const date = app.indexOf('experience-spending-record__date');
  const cast = app.indexOf('experience-spending-record__cast');
  const amount = app.indexOf('experience-spending-record__amount');
  const description = app.indexOf('experience-spending-record__description');
  const remove = app.indexOf('experience-spending-record__delete');
  assert.ok(date >= 0 && date < cast && cast < amount && amount < description && description < remove);
  assert.match(spendingCss, /\.experience-spending-record\s*\{[\s\S]*border-radius:\s*13px/s);
  assert.match(spendingCss, /\.experience-spending-record__delete\s*\{[\s\S]*border-radius:\s*999px/s);
});
