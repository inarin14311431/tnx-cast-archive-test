import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const app = fs.readFileSync("js/acts-app.js", "utf8");
const spendingMigration = fs.readFileSync("supabase/09_experience_spending.sql", "utf8");
const actMutationMigration = fs.readFileSync("supabase/31_act_participant_owner_mutations.sql", "utf8");

test("ACT and spending deletion use the in-page confirmation flow", () => {
  assert.match(app, /function confirmAction\(/);
  assert.match(app, /role=\"dialog\"/);
  assert.match(app, /この操作は元に戻せません/);
  assert.doesNotMatch(app, /window\.confirm\(/);
});

test("ACT and spending mutations are owner-scoped direct operations", () => {
  assert.doesNotMatch(app, /rpc\("delete_owned_act_participation"|rpc\("delete_owned_experience_spending"/);
  assert.match(app, /\.from\("act_participants"\)\s*\.update\([\s\S]*?\.eq\("id", row\.id\)\.eq\("character_id", character\.id\)/s);
  assert.match(app, /\.from\("act_participants"\)\s*\.delete\(\)[\s\S]*?\.eq\("id", row\.id\)\.eq\("character_id", character\.id\)/s);
  assert.match(app, /\.from\("character_experience_spending"\)\s*\.delete\(\)[\s\S]*?\.eq\("id", row\.id\)\.eq\("character_id", character\.id\)/s);
});

test("database grants and RLS cover owner mutations", () => {
  assert.match(actMutationMigration, /grant update, delete on table public\.act_participants to authenticated/i);
  assert.match(actMutationMigration, /create policy act_participants_delete_owner/i);
  assert.match(actMutationMigration, /c\.owner_id = auth\.uid\(\)/i);
  assert.match(spendingMigration, /create policy experience_spending_select_owner/i);
  assert.match(spendingMigration, /create policy experience_spending_delete_owner/i);
  assert.match(spendingMigration, /c\.owner_id = auth\.uid\(\)/i);
  assert.match(spendingMigration, /grant select, insert, update, delete on table public\.character_experience_spending to authenticated/i);
});
