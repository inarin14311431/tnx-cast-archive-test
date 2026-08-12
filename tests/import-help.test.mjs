import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('data import exposes the approved compact panel and guided bookmarklet help', async () => {
  const source = await read('js/sheet-import-help.js');
  assert.match(source, /sheet-import-panel/);
  assert.match(source, /sheet-import-help-button/);
  assert.match(source, /sheet-import-bookmarklet-copy/);
  assert.match(source, /legacy-bookmarklet-copy/);
  assert.match(source, /ブックマークレットとは/);
  assert.match(source, /javascript:/);
  assert.match(source, /キャラシJSONをコピーしました/);
  assert.match(source, /確認して保存/);
  assert.match(source, /Chromeではブックマークバー/);
  assert.match(source, /const steps=\[/);
  assert.match(source, /data-import-step/);
  assert.match(source, /renderStep/);
  assert.match(source, /data-import-next/);
  assert.match(source, /data-import-prev/);
  assert.match(source, /aria-label','データ取込ヘルプ/);
  assert.doesNotMatch(source, /IMPORT<br>HELP/);

  const help = await read('js/help-ui.js');
  assert.match(help, /import "\.\/sheet-import-help\.js"/);

  const css = await read('css-next/components/sheet-import-help.css');
  assert.match(css, /grid-template-areas:"main help" "desc desc" "copy copy"/);
  assert.match(css, /sheet-import-bookmarklet-copy/);
  assert.match(css, /sheet-import-help-progress/);
  assert.match(css, /sheet-import-help-stage/);
  assert.match(css, /var\(--color-accent\)/);
  assert.match(css, /var\(--color-surface\)/);
  assert.match(css, /var\(--color-text\)/);
  assert.doesNotMatch(css, /#35d7ff|#70efa9|rgba\(117,225,255/);
});

test('sidebar action rails follow the active theme tokens', async () => {
  const source = await read('js/sheet-sidebar-actions.js');
  assert.match(source, /action: 'var\(--color-accent\)'/);
  assert.match(source, /save: 'var\(--color-success\)'/);
  assert.doesNotMatch(source, /#35d7ff|#70efa9/);
});
