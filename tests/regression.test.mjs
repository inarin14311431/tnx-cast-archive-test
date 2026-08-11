import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('editor sidebar removes viewer-only transfer actions', async () => {
  const source = await read('js/sheet-sidebar-actions.js');
  assert.match(source, /ココフォリア\|ユドナリウム\|転記TSV\|転記BM/);
  assert.match(source, /const ordered = \[visibility, save, view, importAction, autofill\]/);
});

test('editor sidebar reorder is idempotent and does not observe its own attributes', async () => {
  const source = await read('js/sheet-sidebar-actions.js');
  assert.match(source, /current\.length === ordered\.length/);
  assert.match(source, /current\.every\(\(child, index\) => child === ordered\[index\]\)/);
  assert.doesNotMatch(source, /attributeFilter:\s*\['hidden', 'class', 'id'\]/);
  assert.match(source, /new MutationObserver\(queueArrange\)\.observe\(panel, \{\s*childList: true,\s*subtree: true\s*\}\)/s);
});

test('editor help is exposed through one global trigger', async () => {
  const source = await read('js/help-ui.js');
  assert.match(source, /sheet-global-help/);
  assert.doesNotMatch(source, /installSidebarHelp|installSectionHelp|installImageHelp|installComboHelp/);
});

test('retired JSON repair shim is no longer loaded', async () => {
  const html = await read('sheet.html');
  assert.doesNotMatch(html, /sheet-json-import-repair\.js/);
});

test('style import compatibility owns JSON repair and preserves symbols', async () => {
  const source = await read('js/sheet-import-style-skill-compat.js');
  assert.match(source, /replace\(\/\^\[★■┗†※\]\+\\s\*\//);
  assert.match(source, /setValue\(row\.querySelector\('\[data-f="name"\]'\),data\.name\)/);
  assert.match(source, /repairJsonStringControls/);
  assert.match(source, /removeUnexpectedRows/);
});

test('style detail integrity is separated from import compatibility', async () => {
  const bridge = await read('js/style-skill-import-integrity-fix.js');
  assert.match(bridge, /style-skill-detail-integrity\.js/);
  assert.doesNotMatch(bridge, /decodeDetail|repairRow|MutationObserver/);

  const source = await read('js/style-skill-detail-integrity.js');
  assert.match(source, /structured style-skill detail payloads canonical/);
  assert.match(source, /function decodeDetail/);
  assert.match(source, /function repairRow/);
  assert.doesNotMatch(source, /legacy-import-message|removeUnexpectedRows|TNXLegacyStyleSkillRepair/);
});

test('zero style skills remain a valid editor state', async () => {
  const source = await read('js/style-skill-recovery.js');
  assert.doesNotMatch(source, /MutationObserver|setTimeout|requestAnimationFrame|\.click\(/);
  assert.match(source, /zero style skills is a valid/);

  const sheet = await read('js/sheet.js');
  assert.match(sheet, /#add-style-skill/);
  assert.match(sheet, /addSkill\("style", "normal", ""\)/);
});

test('master search legacy bridge contains no feature implementation', async () => {
  const bridge = await read('js/sheet-master-search-dash-fix.js');
  assert.match(bridge, /sheet-master-search-enhancements\.js/);
  assert.doesNotMatch(bridge, /restoreDash|master-search-details-toggle|createElement\("script"\)|MutationObserver/);
});

test('master search enhancements are separated by responsibility', async () => {
  const entry = await read('js/sheet-master-search-enhancements.js');
  assert.match(entry, /sheet-master-search-result-ui\.js/);
  assert.match(entry, /sheet-master-search-ofc-normalize\.js/);
  assert.match(entry, /sheet-master-search-bs-tooltips\.js/);

  const resultUi = await read('js/sheet-master-search-result-ui.js');
  assert.match(resultUi, /master-search-details-toggle/);
  assert.doesNotMatch(resultUi, /purchase_value|restoreDash|can_use_master_search/);

  const ofc = await read('js/sheet-master-search-ofc-normalize.js');
  assert.match(ofc, /purchase_value/);
  assert.match(ofc, /restoreDash/);
  assert.doesNotMatch(ofc, /master-search-details-toggle|can_use_master_search/);
});

test('save failures expose a diagnostic module with database metadata', async () => {
  const source = await read('js/sheet-save-diagnostics.js');
  assert.match(source, /save_character_bundle/);
  assert.match(source, /error\.code|code:/);
  assert.match(source, /details/);
  assert.match(source, /hint/);
  assert.match(source, /23502|23505|23514|22001|42501/);
});
