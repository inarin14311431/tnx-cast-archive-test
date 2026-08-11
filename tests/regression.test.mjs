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

test('retired compatibility scripts are no longer loaded', async () => {
  const html = await read('sheet.html');
  assert.doesNotMatch(html, /sheet-json-import-repair\.js/);
  assert.doesNotMatch(html, /style-skill-recovery\.js/);
  assert.doesNotMatch(html, /style-skill-import-integrity-fix\.js/);
  assert.match(html, /style-skill-detail-integrity\.js/);
});

test('style import compatibility owns JSON repair and preserves symbols', async () => {
  const source = await read('js/sheet-import-style-skill-compat.js');
  assert.match(source, /replace\(\/\^\[★■┗†※\]\+\\s\*\//);
  assert.match(source, /setValue\(row\.querySelector\('\[data-f="name"\]'\),data\.name\)/);
  assert.match(source, /repairJsonStringControls/);
  assert.match(source, /removeUnexpectedRows/);
});

test('style detail integrity is separated from import compatibility', async () => {
  const source = await read('js/style-skill-detail-integrity.js');
  assert.match(source, /structured style-skill detail payloads canonical/);
  assert.match(source, /function decodeDetail/);
  assert.match(source, /function repairRow/);
  assert.doesNotMatch(source, /legacy-import-message|removeUnexpectedRows|TNXLegacyStyleSkillRepair/);
});

test('zero style skills remain a valid editor state without recovery shim', async () => {
  const html = await read('sheet.html');
  assert.doesNotMatch(html, /style-skill-recovery\.js/);

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
  assert.match(entry, /sheet-master-search-auto-run\.js/);

  const resultUi = await read('js/sheet-master-search-result-ui.js');
  assert.match(resultUi, /master-search-details-toggle/);
  assert.doesNotMatch(resultUi, /purchase_value|restoreDash|can_use_master_search/);

  const ofc = await read('js/sheet-master-search-ofc-normalize.js');
  assert.match(ofc, /purchase_value/);
  assert.match(ofc, /restoreDash/);
  assert.doesNotMatch(ofc, /master-search-details-toggle|can_use_master_search/);
});

test('master search automatically reruns when classification filters change', async () => {
  const source = await read('js/sheet-master-search-auto-run.js');
  assert.match(source, /master-search-filter-primary/);
  assert.match(source, /master-search-filter-secondary/);
  assert.match(source, /addEventListener\("change"/);
  assert.match(source, /master-search-run/);
  assert.match(source, /runButton\.click\(\)/);
  assert.doesNotMatch(source, /supabase|skd_master|ofc_master/);
});

test('save failures expose a diagnostic module with database metadata', async () => {
  const source = await read('js/sheet-save-diagnostics.js');
  assert.match(source, /save_character_bundle/);
  assert.match(source, /\.code/);
  assert.match(source, /\.details/);
  assert.match(source, /\.hint/);
  for (const code of ['23502', '23505', '23514', '22001', '42501']) assert.match(source, new RegExp(code));
});

test('OFC responsibilities keep import compatibility, TSV normalization and display separate', async () => {
  const compat = await read('js/sheet-import-outfit-compat.js');
  assert.match(compat, /legacy-import-apply/);
  assert.match(compat, /sourceOutfits/);

  const categoryBridge = await read('js/outfit-ofc-tsv-category-fix.js');
  assert.match(categoryBridge, /outfit-ofc-tsv-category-normalize\.js/);
  assert.doesNotMatch(categoryBridge, /restoreCategories|targetToCategory|waitForRows/);

  const category = await read('js/outfit-ofc-tsv-category-normalize.js');
  assert.match(category, /function restoreCategories/);
  assert.match(category, /function targetToCategory/);
  assert.doesNotMatch(category, /legacy-import-apply|save_character_bundle/);

  const display = await read('js/outfit-display-rules-v5.js');
  assert.match(display, /const LAYOUTS/);
  assert.match(display, /applySheetLayouts/);
  assert.doesNotMatch(display, /save_character_bundle|legacy-import-apply/);
});

test('OFC save enhancement is isolated from field rendering', async () => {
  const save = await read('js/outfit-ofc-save.js');
  assert.match(save, /save_character_bundle_with_ofc/);
  assert.match(save, /function enrichOutfitPayload/);
  assert.match(save, /ofc_details/);
  assert.doesNotMatch(save, /MutationObserver|master-search-copy|tsv-apply/);

  const access = await read('js/sheet-master-search-access.js');
  assert.match(access, /import "\.\/outfit-ofc-save\.js"/);

  const fields = await read('js/outfit-ofc-fields.js');
  assert.doesNotMatch(fields, /BASE_SAVE_RPC|OFC_SAVE_RPC|wrapSaveRpc|enrichOutfitPayload|__tnxOfcSaveWrapped/);
});

test('OFC TSV transfer is isolated from field rendering', async () => {
  const tsv = await read('js/outfit-ofc-tsv.js');
  assert.match(tsv, /function handleMasterCopy/);
  assert.match(tsv, /function handleTsvImport/);
  assert.match(tsv, /function createFullOfcTsv/);
  assert.match(tsv, /function parseTsv/);
  assert.doesNotMatch(tsv, /save_character_bundle_with_ofc|CATEGORY_FIELDS|enhanceTable/);

  const access = await read('js/sheet-master-search-access.js');
  assert.match(access, /import "\.\/outfit-ofc-tsv\.js"/);

  const fields = await read('js/outfit-ofc-fields.js');
  assert.doesNotMatch(fields, /handleMasterCopy|handleTsvImport|createFullOfcTsv|parseTsv|toTsv|TSV_EXTRA_HEADERS/);
});
