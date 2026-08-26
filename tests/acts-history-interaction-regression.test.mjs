import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../acts.html", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../js/acts-app.js", import.meta.url), "utf8");
const spendingMigration = fs.readFileSync(new URL("../supabase/09_experience_spending.sql", import.meta.url), "utf8");
const actMutationMigration = fs.readFileSync(new URL("../supabase/31_act_participant_owner_mutations.sql", import.meta.url), "utf8");

test("act management loads one state-driven controller without DOM patch scripts", () => {
  assert.match(html, /acts-app\.js\?v=1/);
  assert.doesNotMatch(html, /acts-role\.js|acts-history-enhanced\.js|acts-detail-toggle-fix\.js|acts-ui-fixes\.js|acts-spending\.js/);
  assert.doesNotMatch(app, /MutationObserver/);
  assert.match(app, /const state = \{/);
  assert.match(app, /function renderAll\(\)/);
  assert.match(app, /function renderHistory\(\)/);
  assert.match(app, /function renderSpending\(\)/);
});

test("act and spending deletions use in-page confirmation and owner-scoped direct deletes", () => {
  assert.match(app, /function confirmAction\(/);
  assert.match(app, /role=\"dialog\"/);
  assert.doesNotMatch(app, /window\.confirm\(/);
  assert.doesNotMatch(app, /rpc\("delete_owned_act_participation"|rpc\("delete_owned_experience_spending"/);
  assert.match(app, /\.from\("act_participants"\)\.delete\(\)[\s\S]*\.eq\("id", row\.id\)\.eq\("character_id", character\.id\)/);
  assert.match(app, /\.from\("character_experience_spending"\)\.delete\(\)[\s\S]*\.eq\("id", row\.id\)\.eq\("character_id", character\.id\)/);
});

test("owner-scoped database permissions cover act mutations and spending", () => {
  assert.match(actMutationMigration, /grant update, delete on table public\.act_participants to authenticated/i);
  assert.match(actMutationMigration, /create policy act_participants_delete_owner/i);
  assert.match(actMutationMigration, /c\.owner_id = auth\.uid\(\)/i);
  assert.match(spendingMigration, /create policy experience_spending_delete_owner/i);
  assert.match(spendingMigration, /grant select, insert, update, delete on table public\.character_experience_spending to authenticated/i);
});
