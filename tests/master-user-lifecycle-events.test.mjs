import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const admin = fs.readFileSync(new URL('../js/master-data-admin.js', import.meta.url), 'utf8');
const deletion = fs.readFileSync(new URL('../js/master-user-delete.js', import.meta.url), 'utf8');
const manifest = fs.readFileSync(new URL('../runtime-observer-manifest.json', import.meta.url), 'utf8');

test('master data admin publishes explicit user-panel lifecycle events', () => {
  assert.match(admin, /USER_PANEL_READY_EVENT = "tnx:master-user-panel-ready"/);
  assert.match(admin, /USER_SELECTION_CHANGED_EVENT = "tnx:master-user-selection-changed"/);
  assert.match(admin, /layout\.dispatchEvent\(new CustomEvent\(USER_PANEL_READY_EVENT/);
  assert.match(admin, /panel\.dispatchEvent\(new CustomEvent\(USER_SELECTION_CHANGED_EVENT\)\)/);
});

test('master user deletion waits on lifecycle events without DOM observation or polling', () => {
  assert.match(deletion, /resolveUserPanel\(5000\)/);
  assert.match(deletion, /layout\.addEventListener\(USER_PANEL_READY_EVENT, onReady\)/);
  assert.match(deletion, /panel\.addEventListener\(USER_SELECTION_CHANGED_EVENT, refresh\)/);
  assert.doesNotMatch(deletion, /MutationObserver/);
  assert.doesNotMatch(deletion, /setInterval/);
  assert.doesNotMatch(manifest, /js\/master-user-delete\.js/);
});
