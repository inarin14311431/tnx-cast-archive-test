import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { importSucceeded } from "../js/character-sheet-url-import-sync.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("importSucceeded trusts tnx:legacy-import-base-finished's detail.ok over the message text/state", () => {
  const dialog = { dataset: {} };
  // The exact scenario from the bug report: the base import eventually
  // finished successfully and left a success-looking message, but that
  // string alone (or a stale error dataset.state) must not override the
  // authoritative baseImportOk captured from the event.
  const staleErrorMessage = { dataset: { state: "error" }, textContent: "取込が完了し、編集画面へ反映しました。" };
  assert.equal(importSucceeded(dialog, staleErrorMessage, true), true);

  const successLookingMessage = { dataset: {}, textContent: "取込が完了し、編集画面へ反映しました。" };
  assert.equal(importSucceeded(dialog, successLookingMessage, false), false);
});

test("importSucceeded still returns false while the dialog is busy, regardless of baseImportOk", () => {
  const busyDialog = { dataset: { importing: "1" } };
  const message = { dataset: {}, textContent: "取込が完了し、編集画面へ反映しました。" };
  assert.equal(importSucceeded(busyDialog, message, true), false);
});

test("importSucceeded falls back to the message heuristic when the base-import event never arrived", () => {
  const dialog = { dataset: {} };
  const errorState = { dataset: { state: "error" }, textContent: "取込エラー：何か失敗しました。" };
  assert.equal(importSucceeded(dialog, errorState, undefined), false);

  const errorText = { dataset: {}, textContent: "取込エラー：何か失敗しました。" };
  assert.equal(importSucceeded(dialog, errorText, undefined), false);

  const successText = { dataset: {}, textContent: "取込が完了し、編集画面へ反映しました。" };
  assert.equal(importSucceeded(dialog, successText, undefined), true);
});

test("waitForImportCompletion listens for tnx:legacy-import-base-finished and removes the listener once done", async () => {
  const source = await read("js/character-sheet-url-import-sync.js");
  assert.match(source, /const BASE_IMPORT_EVENT = "tnx:legacy-import-base-finished"/);
  assert.match(source, /document\.addEventListener\(BASE_IMPORT_EVENT, onBaseImportFinished\)/);
  assert.match(source, /document\.removeEventListener\(BASE_IMPORT_EVENT, onBaseImportFinished\)/);
  assert.match(source, /baseImportOk = Boolean\(event\.detail\?\.ok\)/);
});
