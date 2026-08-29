import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const wording = fs.readFileSync(new URL('../js/showcase-wording.js', import.meta.url), 'utf8');
const tagline = fs.readFileSync(new URL('../js/showcase-tagline.js', import.meta.url), 'utf8');
const stickyExp = fs.readFileSync(new URL('../js/sheet-sticky-exp-panel.js', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../runtime-observer-manifest.json', import.meta.url), 'utf8'));

test('showcase wording follows the explicit selection render event without a mutation observer', () => {
  assert.doesNotMatch(wording, /MutationObserver/);
  assert.match(wording, /tnx:showcase-selection-rendered/);
  assert.match(wording, /normalize\(\)/);
  assert.match(tagline, /dispatchEvent\(new CustomEvent\("tnx:showcase-selection-rendered"\)\)/);
  assert.ok(!manifest.files.includes('js/showcase-wording.js'));
});

test('sticky experience panel relies on explicit lifecycle and resize signals', () => {
  assert.doesNotMatch(stickyExp, /MutationObserver/);
  assert.match(stickyExp, /tnx:general-master-ready/);
  assert.match(stickyExp, /ResizeObserver/);
  assert.match(stickyExp, /window\.addEventListener\("load"/);
  assert.ok(!manifest.files.includes('js/sheet-sticky-exp-panel.js'));
});
