import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../acts.html", import.meta.url), "utf8");
const detailFix = fs.readFileSync(new URL("../js/acts-detail-toggle-fix.js", import.meta.url), "utf8");
const deleteFix = fs.readFileSync(new URL("../js/acts-spending-delete-fix.js", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/30_delete_owned_experience_spending.sql", import.meta.url), "utf8");

test("act history loads a capture-phase detail toggle safeguard", () => {
  assert.match(html, /acts-detail-toggle-fix\.js\?v=1/);
  assert.match(detailFix, /addEventListener\("click"[\s\S]*true\)/);
  assert.match(detailFix, /stopImmediatePropagation\(\)/);
  assert.match(detailFix, /classList\.toggle\("is-detail-open", open\)/);
});

test("experience spending deletion is owner scoped through RPC", () => {
  assert.match(deleteFix, /rpc\("delete_owned_experience_spending"/);
  assert.match(migration, /c\.owner_id = v_user_id/);
  assert.match(migration, /grant execute on function public\.delete_owned_experience_spending\(bigint\) to authenticated/);
});
