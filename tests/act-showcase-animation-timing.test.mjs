import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sequence = fs.readFileSync('js/act-showcase-neotokyo.js', 'utf8');
const page = fs.readFileSync('js/act-showcase-page.js', 'utf8');
const html = fs.readFileSync('act-showcase.html', 'utf8');

test('NeoTokyo automatic cinematic phases are not cut off before their CSS motion completes', () => {
  assert.match(sequence, /await wait\(state, 2900\);/);
  assert.match(sequence, /await wait\(state, 1900\);/);
});

test('HANDOUT to ASSIGN linkage keeps split, search, found and cast reveal visible long enough', () => {
  assert.match(sequence, /await wait\(state, 780\);/);
  assert.match(sequence, /await wait\(state, 850\);/);
  assert.match(sequence, /await wait\(state, 560\);/);
  assert.match(sequence, /await wait\(state, 700\);/);
});

test('NeoTokyo timing fix is cache-busted through the module chain', () => {
  assert.match(page, /act-showcase-neotokyo\.js\?v=2/);
  assert.match(html, /act-showcase-page\.js\?v=20260907h/);
});
