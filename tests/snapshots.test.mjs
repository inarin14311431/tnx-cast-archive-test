import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('snapshot storage is capped at ten generations', async () => {
  const sql = await read('supabase/11_character_snapshots.sql');
  assert.match(sql, /create table if not exists public\.character_snapshots/);
  assert.match(sql, /create_character_snapshot/);
  assert.match(sql, /offset 10/);
  assert.match(sql, /snapshot_data jsonb/);
  assert.match(sql, /owner_id = auth\.uid\(\)/);
});

test('snapshot restore reuses transactional character save', async () => {
  const sql = await read('supabase/11_character_snapshots.sql');
  assert.match(sql, /restore_character_snapshot/);
  assert.match(sql, /save_character_bundle\(v_snapshot\.character_id, v_character, v_skills, v_outfits\)/);
});

test('snapshot UI supports create restore and delete without image duplication', async () => {
  const source = await read('js/sheet-snapshots.js');
  assert.match(source, /MAX_SNAPSHOTS = 10/);
  assert.match(source, /create_character_snapshot/);
  assert.match(source, /restore_character_snapshot/);
  assert.match(source, /character_snapshots/);
  assert.doesNotMatch(source, /storage\.from|upload|image blob/i);

  const html = await read('sheet.html');
  assert.match(html, /sheet-snapshots\.js/);
});
