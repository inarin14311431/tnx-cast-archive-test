import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../css-next/pages/account-action-hierarchy.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../account.html', import.meta.url), 'utf8');

test('owned cast action stylesheet exposes explicit hover and focus-visible feedback', () => {
  assert.match(css, /:is\(:hover, :focus-visible\)/);
  assert.match(css, /transform:\s*translateY\(-1px\)/);
  assert.match(css, /box-shadow:[\s\S]*var\(--color-accent\)/);
  assert.match(css, /button\[data-delete\]:is\(:hover, :focus-visible\)[\s\S]*var\(--color-danger\)/);
  assert.match(css, /:active[\s\S]*transform:\s*translateY\(0\)/);
});

test('account page busts cached card interaction CSS', () => {
  assert.match(html, /account-action-hierarchy\.css\?v=5/);
});
