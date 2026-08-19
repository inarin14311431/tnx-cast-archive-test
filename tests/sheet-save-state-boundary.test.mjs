import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const stateSource = await readFile(new URL("../js/sheet-save-state.js", import.meta.url), "utf8");
const featureSource = await readFile(new URL("../js/sheet-features.js", import.meta.url), "utf8");
const snapshotSource = await readFile(new URL("../js/sheet-snapshots.js", import.meta.url), "utf8");
const diagnosticsSource = await readFile(new URL("../js/sheet-save-diagnostics.js", import.meta.url), "utf8");
const sheetHtmlSource = await readFile(new URL("../sheet.html", import.meta.url), "utf8");
const ofcSaveSource = await readFile(new URL("../js/outfit-ofc-save.js", import.meta.url), "utf8");

test("PC save presentation has one shared state bridge", () => {
  assert.match(stateSource, /const STATE_EVENT = "tnx:sheet-save-state"/);
  assert.match(stateSource, /function installSheetSaveState/);
  assert.match(stateSource, /new MutationObserver\(sync\)\.observe\(status/);
  assert.match(stateSource, /globalThis\.TNXSheetSaveState/);
  assert.match(featureSource, /import "\.\/sheet-save-state\.js\?v=1"/);
  assert.doesNotMatch(featureSource, /function initializeSaveButtonState/);
  assert.doesNotMatch(featureSource, /new MutationObserver\(sync\)\.observe\(status/);
});

test("snapshot unsaved guard consumes shared save state instead of parsing save DOM", () => {
  assert.match(snapshotSource, /hasUnsavedSheetChanges/);
  assert.match(snapshotSource, /focusSheetSaveButton/);
  assert.doesNotMatch(snapshotSource, /function hasUnsavedChanges/);
  assert.doesNotMatch(snapshotSource, /querySelector\("#save-status"\)/);
  assert.doesNotMatch(snapshotSource, /querySelector\("#save-button"\)\?\.focus/);
});

test("save diagnostics consumes the shared save-state event instead of observing status DOM", () => {
  assert.match(diagnosticsSource, /sheet-save-state\.js\?v=1/);
  assert.match(diagnosticsSource, /tnx:sheet-save-state/);
  assert.match(diagnosticsSource, /refreshFromState/);
  assert.doesNotMatch(diagnosticsSource, /function observeSaveStatus/);
  assert.doesNotMatch(diagnosticsSource, /new MutationObserver/);
  assert.doesNotMatch(diagnosticsSource, /querySelector\('#save-status'\)/);
});

test("retired manual-save watchdog is not part of the sheet runtime", () => {
  assert.doesNotMatch(sheetHtmlSource, /sheet-save-watchdog\.js/);
});

test("PC OFC save derives modifier validity from canonical contract", () => {
  assert.match(ofcSaveSource, /outfitSupportsControl/);
  assert.match(ofcSaveSource, /outfitSupportsCsModifier/);
  assert.doesNotMatch(ofcSaveSource, /category === "armor" \|\| category === "vehicle"/);
  assert.doesNotMatch(ofcSaveSource, /category === "tron" \|\| category === "vehicle"/);
});
