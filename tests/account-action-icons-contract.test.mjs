import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const icons = fs.readFileSync(new URL('../js/account-action-icons.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css-next/pages/account-action-icons.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../account.html', import.meta.url), 'utf8');

test('owned cast actions render inline currentColor SVG icons', () => {
  for (const name of ['open', 'edit', 'mobile', 'acts', 'duplicate', 'delete']) {
    assert.match(icons, new RegExp(`${name}:`));
  }
  assert.match(icons, /stroke="currentColor"/);
  assert.match(icons, /aria-hidden="true"/);
  assert.match(icons, /MutationObserver/);
});

test('action icon styling follows themed text colors', () => {
  assert.match(css, /\.action-icon[\s\S]*color:\s*currentColor/);
  assert.match(css, /\.owned-cast__links > a,[\s\S]*\.owned-cast__management > a[\s\S]*color:\s*var\(--color-accent\)/);
  assert.match(css, /button\[data-delete\][\s\S]*color:\s*var\(--color-danger\)/);
});

test('account page loads icon assets after card hierarchy styling', () => {
  assert.ok(html.indexOf('account-action-icons.css?v=1') > html.indexOf('account-action-hierarchy.css?v=3'));
  assert.ok(html.indexOf('account-action-icons.js?v=1') > html.indexOf('account.js?v=42'));
});
