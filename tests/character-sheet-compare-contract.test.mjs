import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const compare = fs.readFileSync(new URL("../js/sheet-character-sheet-compare.js", import.meta.url), "utf8");
const snapshots = fs.readFileSync(new URL("../js/sheet-snapshots.js", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/38_snapshot_from_bundle.sql", import.meta.url), "utf8");

test("comparison remains read-only until the user chooses a side", () => {
  assert.match(compare, /getSheetSaveState\(\)\s*!==\s*"saved"/);
  assert.match(compare, /showComparisonModal/);
  assert.match(compare, /compare-adopt-warehouse/);
  assert.match(compare, /compare-keep-archive/);
  assert.match(compare, /差分をコピー/);
  assert.doesNotMatch(compare, /persistSheetBundle/);
  assert.doesNotMatch(compare, /save_character_bundle/);
});

test("large comparisons collapse modal details but retain full clipboard output", () => {
  assert.match(compare, /const\s+DETAIL_LIMIT\s*=\s*10/);
  assert.match(compare, /differences\.length\s*<=\s*DETAIL_LIMIT/);
  assert.match(compare, /差分が多いため詳細表示を省略/);
  assert.match(compare, /for\s*\(\s*const\s+item\s+of\s+context\.differences\s*\)/);
  assert.match(compare, /navigator\.clipboard\.writeText/);
});

test("choice actions snapshot the opposite version before adopting", () => {
  assert.match(compare, /snapshots\.createCurrent/);
  assert.match(compare, /applyLegacyPayload\(context\.externalPayload\)/);
  assert.match(compare, /snapshots\.createBundle/);
  assert.match(compare, /character:\s*\{\s*\.\.\.context\.archiveBundle\.character,\s*\.\.\.context\.warehouseBundle\.character/);
});

test("comparison reuses the existing snapshot table and restore format", () => {
  assert.match(snapshots, /create_character_snapshot_from_bundle/);
  assert.match(snapshots, /TNXSheetSnapshots/);
  assert.match(migration, /returns public\.character_snapshots/);
  assert.match(migration, /insert into public\.character_snapshots/);
  assert.match(migration, /offset 10/);
  assert.match(migration, /jsonb_typeof\(p_snapshot_data->'character'\)/);
});
