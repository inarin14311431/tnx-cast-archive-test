import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const FILE = "supabase/migrations/20261021_drop_migration_backup_schemas.sql";
const sql = await readFile(new URL(`../${FILE}`, import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../supabase/migrations-manifest.json", import.meta.url), "utf8"));
const code = sql.split("\n").filter(line => !line.trim().startsWith("--")).join("\n");
const statements = code.split(";").map(statement => statement.replace(/\s+/g, " ").trim()).filter(Boolean);

test("migration is registered after the previous migration", () => {
  const index = manifest.files.indexOf(FILE.replace("supabase/", ""));
  assert.ok(index > manifest.files.indexOf("migrations/20261020_unlisted_bundle_troops_public_and_rls_initplan.sql"));
  assert.equal(index, manifest.files.length - 1);
});

test("header states the reason, the targets with row counts, and that the drop cannot be undone", () => {
  const header = sql.split("\n").filter(line => line.startsWith("--")).join("\n");
  assert.match(header, /退会/);
  assert.match(header, /削除は元に戻せない\(ロールバック不可\)/);
  for (const count of ["506行", "300行", "2,499行", "13行"]) assert.ok(header.includes(count), count);
  for (const name of [
    "internal_archive.character_skills_backup_style_canonical_20260825",
    "internal_archive.character_outfits_backup_ofc_conversion_20260818",
    "migration_backup_20260901.character_skills",
    "migration_backup_20260901.character_snapshots",
    "migration_backup_20260901.parse_legacy_style_detail"
  ]) assert.ok(header.includes(name), name);
});

test("only the five listed objects are dropped, each on its own", () => {
  const drops = statements.filter(statement => /^drop /i.test(statement) && !/^drop schema /i.test(statement));
  assert.deepEqual(drops, [
    "drop table if exists internal_archive.character_skills_backup_style_canonical_20260825",
    "drop table if exists internal_archive.character_outfits_backup_ofc_conversion_20260818",
    "drop table if exists migration_backup_20260901.character_skills",
    "drop table if exists migration_backup_20260901.character_snapshots",
    "drop function if exists migration_backup_20260901.parse_legacy_style_detail(text)"
  ]);
});

test("the two schemas are dropped with restrict only after an emptiness check that raises", () => {
  const schemaDrops = statements.filter(statement => /^drop schema /i.test(statement));
  assert.deepEqual(schemaDrops, [
    "drop schema if exists internal_archive restrict",
    "drop schema if exists migration_backup_20260901 restrict"
  ]);
  const check = code.indexOf("raise exception");
  assert.ok(check > 0, "emptiness check must raise");
  assert.ok(check < code.indexOf("drop schema"), "the check must come before the first drop schema");
  assert.match(code, /n\.nspname in \('internal_archive', 'migration_backup_20260901'\)/);
  for (const catalog of ["pg_class", "pg_proc", "pg_type"]) assert.ok(code.includes(catalog), catalog);
  assert.match(code, /if remaining is not null then/);
});

test("no cascade and no touching of the public schema", () => {
  assert.doesNotMatch(code, /cascade/i);
  assert.doesNotMatch(code, /\bpublic\./i);
  assert.doesNotMatch(code, /\b(alter|create|grant|revoke|insert|update|delete|truncate)\b/i);
});
