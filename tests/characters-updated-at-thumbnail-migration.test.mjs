import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const FILE = "supabase/migrations/20261016_characters_updated_at_ignore_thumbnail.sql";
const sql = await readFile(new URL(`../${FILE}`, import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../supabase/migrations-manifest.json", import.meta.url), "utf8"));
const code = sql.split("\n").filter(line => !line.trim().startsWith("--")).join("\n");

test("migration is tracked after the migration that was newest before it", () => {
  const index = manifest.files.indexOf(FILE.replace("supabase/", ""));
  assert.ok(index > 0, "manifest must list the migration");
  assert.equal(index, manifest.files.indexOf("migrations/20260930_character_share_links.sql") + 1, "it must directly follow the previous migration");
});

test("trigger function skips the bump only for a thumbnail-only update", () => {
  assert.match(code, /create or replace function public\.characters_touch_updated_at\(\)/);
  assert.match(code, /returns trigger/);
  assert.match(code, /set search_path = public, pg_temp/);
  assert.match(code, /new\.image_thumbnail_url is distinct from old\.image_thumbnail_url/);
  assert.match(code, /\(to_jsonb\(new\) - 'image_thumbnail_url'\) is not distinct from \(to_jsonb\(old\) - 'image_thumbnail_url'\)/);
  assert.match(code, /new\.updated_at = now\(\)/);
});

test("trigger is re-pointed without touching the shared set_updated_at() or granting access", () => {
  assert.match(code, /drop trigger if exists characters_set_updated_at on public\.characters/);
  assert.match(code, /before update on public\.characters[\s\S]*execute function public\.characters_touch_updated_at\(\)/);
  assert.doesNotMatch(code, /replace function public\.set_updated_at|drop function[^;]*set_updated_at\(\)/, "set_updated_at() must stay as is for rollback");
  assert.match(code, /revoke all on function public\.characters_touch_updated_at\(\) from public, anon, authenticated/);
  assert.doesNotMatch(code, /grant /i);
});

test("the regeneration doc states the real mechanism and the pre-migration warning", async () => {
  const doc = await readFile(new URL("../docs/THUMBNAIL_REGENERATION.md", import.meta.url), "utf8");
  assert.match(doc, /characters_set_updated_at/);
  assert.match(doc, /適用前にスクリプトを `--apply` で実行しない/);
  assert.match(doc, /--limit 3 --apply/);
  assert.doesNotMatch(doc, /updated_at など他の列は変えない/);
});
