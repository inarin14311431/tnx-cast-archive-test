import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = name => readFile(new URL(`../js/${name}`, import.meta.url), "utf8");

const [
  sheet,
  payload,
  persistence,
  loadPersistence,
  coordinator,
  state,
  diagnostics,
  ofcSave
] = await Promise.all([
  read("sheet.js"),
  read("sheet-save-payload.js"),
  read("sheet-save-persistence.js"),
  read("sheet-load-persistence.js"),
  read("sheet-save-coordinator.js"),
  read("sheet-save-state.js"),
  read("sheet-save-diagnostics.js"),
  read("outfit-ofc-save.js")
]);

test("classic editor keeps database transport ownership outside sheet.js", () => {
  assert.doesNotMatch(sheet, /supabase\.rpc\s*\(/);
  assert.doesNotMatch(sheet, /supabase\.from\s*\(/);
  assert.match(sheet, /persistSheetBundle\(/);
  assert.match(sheet, /loadSheetBundle\(/);
  assert.match(persistence, /save_character_bundle_with_ofc/);
  assert.match(persistence, /p_character_id:/);
  assert.match(persistence, /p_character:/);
  assert.match(persistence, /p_skills:/);
  assert.match(persistence, /p_outfits:/);
  assert.match(loadPersistence, /\.from\("characters"\)/);
  assert.match(loadPersistence, /\.from\("character_skills"\)/);
  assert.match(loadPersistence, /\.from\("character_outfits"\)/);
});

test("DB-shaped serialization remains DOM-free and isolated from persistence", () => {
  assert.doesNotMatch(payload, /document\.|querySelector|window\.|supabase/);
  assert.doesNotMatch(persistence, /document\.|querySelector|#save-/);
  assert.doesNotMatch(loadPersistence, /document\.|querySelector|#save-/);
  assert.match(sheet, /buildCharacterSavePayload/);
  assert.match(sheet, /buildSkillSavePayloads/);
  assert.match(sheet, /buildOutfitSavePayloads/);
});

test("save lifecycle modules do not regain database or payload ownership", () => {
  assert.doesNotMatch(coordinator, /supabase|save_character_bundle|p_character|p_skills|p_outfits/);
  assert.doesNotMatch(state, /supabase|save_character_bundle|p_character|p_skills|p_outfits/);
  assert.doesNotMatch(diagnostics, /supabase-client|supabase\.rpc\s*=/);
});

test("save state presentation remains explicit rather than DOM-derived", () => {
  assert.match(state, /setSheetSaveState/);
  assert.doesNotMatch(state, /MutationObserver/);
  assert.doesNotMatch(coordinator, /querySelector\(["']#save-status/);
  assert.doesNotMatch(diagnostics, /MutationObserver/);
});

test("OFC enrichment remains an explicit pure persistence dependency", () => {
  assert.match(persistence, /enrichOutfitPayload/);
  assert.match(ofcSave, /export function enrichOutfitPayload/);
  assert.doesNotMatch(ofcSave, /supabase-client|supabase\.rpc\s*=|__tnxOfcSaveWrapped/);
});

test("retired save compatibility cannot leak back through current save modules", () => {
  const currentSaveSources = [sheet, payload, persistence, coordinator, state, diagnostics];
  for (const source of currentSaveSources) {
    assert.doesNotMatch(source, /mundane_modifier/);
    assert.doesNotMatch(source, /control_value/);
    assert.doesNotMatch(source, /cs_value/);
  }
  assert.doesNotMatch(payload, /\bdefense\s*:/);
});

test("save-in-flight edits stay protected by revision-aware coordinator logic", () => {
  assert.match(coordinator, /let changeRevision = 0/);
  assert.match(coordinator, /changeRevision \+= 1/);
  assert.match(coordinator, /const revisionAtStart = changeRevision/);
  assert.match(coordinator, /const changedWhileSaving = changeRevision !== revisionAtStart/);
  assert.match(coordinator, /if \(changedWhileSaving\) pending = true/);
});
