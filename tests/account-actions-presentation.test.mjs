import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const account = fs.readFileSync(new URL('../js/account.js', import.meta.url), 'utf8');
const mobileLinks = fs.readFileSync(new URL('../js/account-mobile-editor-links.js', import.meta.url), 'utf8');
const icons = fs.readFileSync(new URL('../js/account-action-icons.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css-next/pages/account-action-hierarchy.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../account.html', import.meta.url), 'utf8');
const entry = fs.readFileSync(new URL('../css-next/pages/account-entry.css', import.meta.url), 'utf8');

test('account cast actions keep the requested hierarchy and routes', () => {
  assert.match(account, /actionLabel\("閲覧", "OPEN"\)/);
  assert.match(account, /actionLabel\("シート編集", "EDIT SHEET"\)/);
  assert.match(account, /sheet-mobile\.html\?id=\$\{id\}/);
  assert.equal((account.match(/actionLabel\("モバイル編集", "MOBILE EDIT"\)/g) || []).length, 1);
  assert.match(account, /owned-cast__management[\s\S]*actionLabel\("参加アクト", "ACTS"\)/);
  assert.match(account, /owned-cast__management-label">管理機能/);
  assert.match(account, /actionLabel\("複製", "DUPLICATE"\)/);
  assert.match(account, /actionLabel\("削除", "DELETE"\)/);
  assert.match(account, /\(cast\|sheet\|sheet-mobile\|acts\)/);
  assert.doesNotMatch(mobileLinks, /data-mobile-sheet-link|createElement\("a"\)|pc\.after\(link\)/);
});

test('account cast actions keep consolidated icons and stylesheet ownership', () => {
  for (const name of ['open', 'edit', 'mobile', 'acts', 'duplicate', 'delete']) {
    assert.match(icons, new RegExp(`${name}:`));
  }
  assert.match(icons, /stroke="currentColor"/);
  assert.match(icons, /aria-hidden="true"/);
  assert.match(icons, /MutationObserver/);
  assert.match(html, /account-entry\.css\?v=1/);
  assert.match(entry, /account-action-hierarchy\.css\?v=7/);
  assert.doesNotMatch(html, /account-action-icons\.css/);
  assert.doesNotMatch(html, /account-mobile-compact\.css/);
  assert.ok(html.indexOf('account-action-icons.js?v=1') > html.indexOf('account.js?v=42'));
});

test('account cast action layout stays compact and theme aware', () => {
  assert.match(css, /\.owned-cast \{[\s\S]*grid-template-columns:\s*minmax\(230px, \.8fr\) minmax\(500px, 1\.35fr\)/);
  assert.match(css, /\.owned-cast__links[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.owned-cast__management[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 2fr\)/);
  assert.match(css, /\.owned-cast__management > a[\s\S]*min-height:\s*46px/);
  assert.match(css, /\.owned-cast__links > a[\s\S]*min-height:\s*46px/);
  assert.match(css, /\.owned-cast__management > button[\s\S]*width:\s*56px/);
  assert.match(css, /\.action-icon[\s\S]*color:\s*currentColor/);
  assert.match(css, /\.owned-cast__links > a,[\s\S]*\.owned-cast__management > a[\s\S]*color:\s*var\(--color-accent\)/);
  assert.match(css, /button\[data-delete\][\s\S]*color:\s*var\(--color-danger\)/);
});

test('account cast action interaction feedback preserves readable text', () => {
  assert.match(css, /:is\(:hover, :focus-visible\)/);
  assert.match(css, /transform:\s*translateY\(-1px\)/);
  assert.match(css, /box-shadow:[\s\S]*var\(--color-accent\)/);
  assert.match(css, /button\[data-delete\]:is\(:hover, :focus-visible\)[\s\S]*var\(--color-danger\)/);
  assert.match(css, /:active[\s\S]*transform:\s*translateY\(0\)/);
  assert.match(css, /\.owned-cast :is\(\.owned-cast__links > a, \.owned-cast__management > a\):is\(:hover, :focus-visible\)[\s\S]*color:\s*var\(--color-text\)/);
  assert.match(css, /\.owned-cast__management > button:is\(:hover, :focus-visible\)[\s\S]*color:\s*var\(--color-text\)/);
  assert.doesNotMatch(css, /color:\s*color-mix\(in srgb, var\(--color-accent\) 88%, var\(--color-text\)\)/);
  assert.match(css, /button\[data-duplicate\]:is\(:hover, :focus-visible\)[\s\S]*var\(--color-accent\)/);
  assert.match(css, /button\[data-delete\]:is\(:hover, :focus-visible\)[\s\S]*var\(--color-danger\)/);
});
