import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const urlImport = await readFile(new URL('../js/sheet-import-url.js', import.meta.url), 'utf8');
const styleCompat = await readFile(new URL('../js/sheet-import-style-skill-compat.js', import.meta.url), 'utf8');

test('URL import waits for canonical style-skill repair before allowing save', () => {
  assert.match(urlImport, /const saveButton=document\.querySelector\('#save-button'\)/);
  assert.match(urlImport, /if\(saveButton\)saveButton\.disabled=true/);
  assert.match(urlImport, /const styleRepair=window\.TNXLegacyStyleSkillRepair/);
  assert.match(urlImport, /await waitForStyleRepair\(styleRepair\)/);
  assert.match(urlImport, /if\(saveButton\)saveButton\.disabled=restoreSaveDisabled/);
});

test('style-skill repair serializes the complete canonical detail payload', () => {
  assert.match(styleCompat, /@@TNX_STYLE_DETAIL_V1@@/);
  for (const key of ['skill','limit','timing','target','range','difficulty','confrontation','description','page']) {
    assert.match(styleCompat, new RegExp(`${key}:String\\(`), `${key} must be preserved in STYLE_DETAIL_V1`);
  }
  assert.match(styleCompat, /setValue\(row\.querySelector\('\[data-f="description"\]'\),encodeStyleDetail\(data\)\)/);
});
