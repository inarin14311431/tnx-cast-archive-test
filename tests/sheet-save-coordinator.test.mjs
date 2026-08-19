import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
const coordinatorSource = await readFile(new URL("../js/sheet-save-coordinator.js", import.meta.url), "utf8");
const stateSource = await readFile(new URL("../js/sheet-save-state.js", import.meta.url), "utf8");
const persistenceSource = await readFile(new URL("../js/sheet-save-persistence.js", import.meta.url), "utf8");

test("classic sheet delegates save lifecycle state to the coordinator", () => {
  assert.match(sheetSource, /createSheetSaveCoordinator/);
  assert.match(sheetSource, /saveCoordinator\.save\(true\)/);
  assert.match(sheetSource, /saveCoordinator\.markDirty\(\)/);
  assert.match(sheetSource, /saveCoordinator\.markLoading/);
  assert.match(sheetSource, /saveCoordinator\.markSaved\(\)/);
  assert.match(sheetSource, /saveCoordinator\.markLoadError/);
  assert.match(sheetSource, /saveCoordinator\.hasUnsavedChanges\(\)/);
  assert.doesNotMatch(sheetSource, /let dirty\s*=/);
  assert.doesNotMatch(sheetSource, /let saving\s*=/);
  assert.doesNotMatch(sheetSource, /let pending\s*=/);
  assert.doesNotMatch(sheetSource, /function saveAll\s*\(/);
  assert.doesNotMatch(sheetSource, /function setStatus\s*\(/);
  assert.doesNotMatch(sheetSource, /function pulse\s*\(/);
});

test("save coordinator owns dirty, saving and queued-save mechanics", () => {
  assert.match(coordinatorSource, /let dirty = false/);
  assert.match(coordinatorSource, /let saving = false/);
  assert.match(coordinatorSource, /let pending = false/);
  assert.match(coordinatorSource, /async function save\(force = false\)/);
  assert.match(coordinatorSource, /if \(saving\) \{[\s\S]*pending = true/);
  assert.match(coordinatorSource, /queueMicrotask\(\(\) => save\(false\)\)/);
});

test("save coordinator publishes lifecycle through the shared state store", () => {
  assert.match(coordinatorSource, /sheet-save-state\.js\?v=2/);
  assert.match(coordinatorSource, /setSheetSaveState/);
  assert.match(coordinatorSource, /function publish\(state, text = ""\)/);
  assert.doesNotMatch(coordinatorSource, /querySelector\("#save-status"\)/);
  assert.doesNotMatch(coordinatorSource, /STATUS_SELECTOR/);
});

test("save coordinator publishes structured errors without diagnostics intercepting RPC", () => {
  assert.match(coordinatorSource, /const SAVE_ERROR_EVENT = "tnx:sheet-save-error"/);
  assert.match(coordinatorSource, /function publishError\(error, text\)/);
  assert.match(coordinatorSource, /detail: \{ error, text: String\(text \|\| ""\) \}/);
  assert.match(coordinatorSource, /publishError\(error, text\);[\s\S]*publish\("error", text\)/);
});

test("shared save requests call the coordinator directly instead of clicking the save button", () => {
  assert.match(coordinatorSource, /registerSheetSaveRequester/);
  assert.match(coordinatorSource, /registerSheetSaveRequester\(\(\) => save\(true\)\)/);
  assert.match(stateSource, /export function registerSheetSaveRequester/);
  assert.match(stateSource, /return saveRequester\(\)/);
  assert.doesNotMatch(stateSource, /button\.click\(\)/);
});

test("transactional persistence is isolated behind the classic sheet persistence module", () => {
  assert.match(sheetSource, /sheet-save-persistence\.js\?v=1/);
  assert.match(sheetSource, /persistSheetBundle\(\{/);
  assert.match(sheetSource, /character: collectCharacter\(\)/);
  assert.match(sheetSource, /skills: collectSkills\(\)/);
  assert.match(sheetSource, /outfits: collectOutfits\(\)/);
  assert.doesNotMatch(sheetSource, /supabase\.rpc\("save_character_bundle"/);
  assert.match(persistenceSource, /const SAVE_RPC = "save_character_bundle"/);
  assert.match(persistenceSource, /supabase\.rpc\(SAVE_RPC/);
  assert.match(persistenceSource, /p_character: character/);
  assert.match(persistenceSource, /p_skills: skills/);
  assert.match(persistenceSource, /p_outfits: outfits/);
  assert.match(sheetSource, /tnx:character-saved/);
});
