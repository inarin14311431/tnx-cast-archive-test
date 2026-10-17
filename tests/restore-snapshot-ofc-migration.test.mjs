import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const FILE = "supabase/migrations/20261017_restore_snapshot_via_ofc_save.sql";
const sql = await readFile(new URL(`../${FILE}`, import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../supabase/migrations-manifest.json", import.meta.url), "utf8"));
const code = sql.split("\n").filter(line => !line.trim().startsWith("--")).join("\n");

test("migration is tracked right after the migration that preceded it", () => {
  const index = manifest.files.indexOf(FILE.replace("supabase/", ""));
  assert.ok(index > 0, "manifest must list the migration");
  assert.equal(manifest.files[index - 1], "migrations/20261016_characters_updated_at_ignore_thumbnail.sql", "it must stay appended after the previous newest entry");
});

test("restore goes through save_character_bundle_with_ofc, not save_character_bundle", () => {
  assert.match(code, /create or replace function public\.restore_character_snapshot\(p_snapshot_id uuid\)/);
  assert.match(code, /public\.save_character_bundle_with_ofc\(v_snapshot\.character_id, v_character, v_skills, v_outfits\)/);
  assert.doesNotMatch(code, /public\.save_character_bundle\(/);
});

test("restore keeps the owner check, invoker rights and search_path", () => {
  assert.match(code, /returns jsonb/);
  assert.match(code, /security invoker/);
  assert.match(code, /set search_path = public, pg_temp/);
  assert.match(code, /where id = p_snapshot_id and owner_id = v_user_id/);
  assert.match(code, /Authentication is required\./);
  assert.doesNotMatch(code, /security definer/i);
  assert.doesNotMatch(code, /\bgrant\b|\brevoke\b/i, "create or replace keeps the existing ACL");
});

test("old snapshots without a character_sheet_url string keep the current URL", () => {
  assert.match(code, /jsonb_typeof\(v_character->'character_sheet_url'\) is distinct from 'string'/);
  assert.match(code, /from public\.characters as c\s+where c\.id = v_snapshot\.character_id and c\.owner_id = v_user_id/);
  assert.match(code, /v_character\s+\|\|\s+jsonb_build_object\('character_sheet_url', coalesce\(v_current_url, ''\)\)/);
  const inject = code.search(/v_character\s+\|\|\s+jsonb_build_object/);
  const save = code.indexOf("save_character_bundle_with_ofc(");
  assert.ok(inject > 0 && inject < save, "the URL is injected before the save call");
});

test("migration only replaces the restore function and never edits applied migrations", () => {
  assert.equal((code.match(/create or replace function/g) || []).length, 1);
  assert.doesNotMatch(code, /\b(update|delete)\s+(from\s+)?public\./i);
  assert.doesNotMatch(code, /drop (function|table|trigger)/i);
});
