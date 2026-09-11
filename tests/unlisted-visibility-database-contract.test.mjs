import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../supabase/migrations/20260912_preserve_unlisted_visibility.sql', import.meta.url),
  'utf8'
);

test('database save migration preserves public, unlisted, and private semantics', () => {
  assert.match(migration, /in \('public', 'unlisted'\)/);
  assert.match(migration, /then p_character->>'visibility'/);
  assert.match(migration, /else 'private' end/);
  assert.match(migration, /Expected 2 legacy visibility normalizers/);
});
