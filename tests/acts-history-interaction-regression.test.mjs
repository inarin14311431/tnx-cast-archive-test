import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../acts.html", import.meta.url), "utf8");
const detailFix = fs.readFileSync(new URL("../js/acts-detail-toggle-fix.js", import.meta.url), "utf8");
const spending = fs.readFileSync(new URL("../js/acts-spending.js", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/09_experience_spending.sql", import.meta.url), "utf8");

test("act history loads a capture-phase detail toggle safeguard", () => {
  assert.match(html, /acts-detail-toggle-fix\.js\?v=1/);
  assert.match(detailFix, /addEventListener\("click"[\s\S]*true\)/);
  assert.match(detailFix, /stopImmediatePropagation\(\)/);
  assert.match(detailFix, /classList\.toggle\("is-detail-open", open\)/);
});

test("experience spending deletion has one confirmed canonical handler", () => {
  assert.doesNotMatch(html, /acts-spending-delete-fix\.js/);
  assert.match(html, /acts-spending\.js\?v=7/);
  assert.match(spending, /elements\.list\?\.addEventListener\("click", deleteSpendingRecord\)/);
  assert.match(spending, /window\.confirm\(/);
  assert.match(spending, /\.from\("character_experience_spending"\)[\s\S]*\.delete\(\)[\s\S]*\.eq\("id", numericId\)/);
  assert.doesNotMatch(spending, /rpc\("delete_owned_experience_spending"/);
});

test("experience spending deletion is restricted to the current user's casts by RLS", () => {
  assert.match(migration, /create policy experience_spending_delete_owner/i);
  assert.match(migration, /c\.owner_id = auth\.uid\(\)/);
  assert.match(migration, /grant select, insert, update, delete on table public\.character_experience_spending to authenticated/i);
});
