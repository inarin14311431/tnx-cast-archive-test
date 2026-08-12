import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('data import exposes dedicated bookmarklet help beside the import action', async () => {
  const source = await read('js/sheet-import-help.js');
  assert.match(source, /sheet-import-help-button/);
  assert.match(source, /sheet-import-control/);
  assert.match(source, /ブックマークレットとは/);
  assert.match(source, /javascript:/);
  assert.match(source, /キャラシJSONをコピーしました/);
  assert.match(source, /最後に保存/);

  const help = await read('js/help-ui.js');
  assert.match(help, /import "\.\/sheet-import-help\.js"/);

  const css = await read('css-next/components/sheet-import-help.css');
  assert.match(css, /position:absolute/);
  assert.match(css, /right:6px/);
});
