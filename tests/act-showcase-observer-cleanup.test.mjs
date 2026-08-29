import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../act-showcase.html', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../runtime-observer-manifest.json', import.meta.url), 'utf8'));
const obsoleteModule = new URL('../js/act-showcase-title-fit.js', import.meta.url);

test('obsolete act showcase title mutation observer remains removed', () => {
  assert.equal(fs.existsSync(obsoleteModule), false);
  assert.doesNotMatch(html, /act-showcase-title-fit\.js/);
  assert.ok(!manifest.files.includes('js/act-showcase-title-fit.js'));
});
