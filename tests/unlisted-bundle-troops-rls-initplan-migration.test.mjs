import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const FILE = "supabase/migrations/20261020_unlisted_bundle_troops_public_and_rls_initplan.sql";
const sql = await readFile(new URL(`../${FILE}`, import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../supabase/migrations-manifest.json", import.meta.url), "utf8"));
const code = sql.split("\n").filter(line => !line.trim().startsWith("--")).join("\n");

test("migration is registered after the cast order migration and documents rollback", () => {
  const index = manifest.files.indexOf(FILE.replace("supabase/", ""));
  assert.ok(index > manifest.files.indexOf("migrations/20261017_act_participant_cast_orders.sql"));
  assert.match(sql, /ロールバック手順/);
});

test("bundle RPC only adds the troops visibility filter and keeps its security settings", () => {
  assert.match(code, /create or replace function public\.get_unlisted_character_bundle\(p_share_token uuid\)/);
  assert.match(code, /stable security definer\s+set search_path = 'public', 'pg_temp'/);
  assert.match(code, /where t\.character_id = c\.id\s+and t\.visibility = 'public'/);
  assert.match(code, /c\.visibility in \('public', 'unlisted'\)/);
  assert.doesNotMatch(code, /\bgrant\b|\brevoke\b/i);
});

test("RLS rewrite uses ALTER POLICY only, covers 35 policies, and leaves no bare auth.uid()", () => {
  assert.equal((code.match(/^alter policy /gm) || []).length, 35);
  assert.doesNotMatch(code, /drop policy|create policy/i);
  assert.doesNotMatch(code, /\bto (public|anon|authenticated)\b/i, "roles must not change");
  assert.equal((code.match(/auth\.uid\(\)/g) || []).length, (code.match(/\(select auth\.uid\(\)\)/g) || []).length);
});
