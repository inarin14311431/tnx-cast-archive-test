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

test('style detail integrity no longer performs import duplicate cleanup', async () => {
  const source = await read('js/style-skill-import-integrity-fix.js');
  assert.doesNotMatch(source, /dedupeImportedRows|legacy-import-message/);
  assert.match(source, /structured style-skill detail payloads canonical/);
});

test('zero style skills remain a valid editor state', async () => {
  const source = await read('js/style-skill-recovery.js');
  assert.doesNotMatch(source, /MutationObserver|setTimeout|requestAnimationFrame|\.click\(/);
  assert.match(source, /zero style skills is a valid/);

  const sheet = await read('js/sheet.js');
  assert.match(sheet, /#add-style-skill/);
  assert.match(sheet, /addSkill\("style", "normal", ""\)/);
});
