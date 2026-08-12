import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('data import exposes the approved import panel and bookmarklet help', async () => {
  const source = await read('js/sheet-import-help.js');
  assert.match(source, /sheet-import-panel/);
  assert.match(source, /sheet-import-help-button/);
  assert.match(source, /sheet-import-bookmarklet-copy/);
  assert.match(source, /legacy-bookmarklet-copy/);
  assert.match(source, /ブックマークレットとは？/);
  assert.match(source, /javascript:/);
  assert.match(source, /キャラシJSONをコピーしました/);
  assert.match(source, /内容を確認して、キャストを保存/);
  assert.match(source, /ブックマークレットの登録方法（Chrome の例）/);

  const help = await read('js/help-ui.js');
  assert.match(help, /import "\.\/sheet-import-help\.js"/);

  const css = await read('css-next/components/sheet-import-help.css');
  assert.match(css, /grid-template-areas:"main help" "desc desc" "copy copy"/);
  assert.match(css, /sheet-import-bookmarklet-copy/);
  assert.match(css, /sheet-import-help-body/);
  assert.doesNotMatch(css, /sheet-import-help-button\{position:absolute/);
});
