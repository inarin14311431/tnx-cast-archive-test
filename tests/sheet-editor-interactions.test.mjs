import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-editor-interactions.js", import.meta.url), "utf8");

test("sheet editor interactions owns generic edit, toggle and unload lifecycle", () => {
  assert.match(source, /export function initSheetEditorInteractions/);
  assert.match(source, /addEventListener\("input"/);
  assert.match(source, /addEventListener\("change"/);
  assert.match(source, /addEventListener\("click"/);
  assert.match(source, /addEventListener\("beforeunload"/);
  assert.match(source, /input,select,textarea/);
  assert.match(source, /\.section-toggle/);
  assert.match(source, /hasUnsavedChanges\(\)/);
});

test("sheet editor interactions is idempotent per root and window", () => {
  assert.match(source, /new WeakSet\(\)/);
  assert.match(source, /initializedRoots\.has\(root\)/);
  assert.match(source, /initializedWindows\.has\(windowRef\)/);
});

test("classic sheet delegates generic lifecycle binding", async () => {
  const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.match(sheetSource, /sheet-editor-interactions\.js\?v=2/);
  assert.match(sheetSource, /initSheetEditorInteractions\(/);
  assert.doesNotMatch(sheetSource, /document\.addEventListener\("input", onEdit\)/);
  assert.doesNotMatch(sheetSource, /window\.addEventListener\("beforeunload"/);
  assert.doesNotMatch(sheetSource, /function onEdit\(/);
});

function createFakeRoot() {
  const listeners = {};
  return {
    listeners,
    querySelectorAll: () => [],
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
    dispatch(type, target) { for (const handler of listeners[type] || []) handler({ type, target }); }
  };
}

function createFakeControl({ transient = false } = {}) {
  return {
    matches: selector => selector === "input,select,textarea",
    closest: selector => (transient && selector === "[data-sheet-transient]" ? {} : null)
  };
}

test("controls inside [data-sheet-transient] do not trigger onEdit; regular controls do", async () => {
  const { initSheetEditorInteractions } = await import("../js/sheet-editor-interactions.js");
  const root = createFakeRoot();
  const windowRef = { addEventListener() {} };
  const edits = [];
  initSheetEditorInteractions({ root, windowRef, onEdit: event => edits.push(event) });

  const transient = createFakeControl({ transient: true });
  root.dispatch("input", transient);
  root.dispatch("change", transient);
  assert.equal(edits.length, 0);

  const regular = createFakeControl();
  root.dispatch("input", regular);
  root.dispatch("change", regular);
  assert.equal(edits.length, 2);
  assert.ok(edits.every(event => event.target === regular));
});

test("snapshot panel and import/search dialogs are marked as transient", async () => {
  const snapshots = await readFile(new URL("../js/sheet-snapshots.js", import.meta.url), "utf8");
  const tsv = await readFile(new URL("../js/sheet-tsv-import.js", import.meta.url), "utf8");
  const masterSearch = await readFile(new URL("../js/sheet-master-search.js", import.meta.url), "utf8");
  assert.match(snapshots, /panel\.className = "sheet-snapshot-panel";\s*panel\.dataset\.sheetTransient = "";/);
  assert.match(tsv, /dialog\.id = "tsv-dialog";\s*dialog\.dataset\.sheetTransient = "";/);
  assert.match(masterSearch, /dialog\.className = "master-search-dialog";\s*dialog\.dataset\.sheetTransient = "";/);
  assert.doesNotMatch(source, /snapshot-label/);
});
