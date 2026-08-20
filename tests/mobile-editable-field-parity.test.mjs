import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile profile covers every PC editable character/profile field", async () => {
  const mobile = await read("js/sheet-mobile.js");
  const personal = await read("js/sheet-personal-data.js");
  const snapshot = await read("js/sheet-character-input-snapshot.js");

  for (const field of [
    "character_name", "character_kana", "handle", "handle_kana", "player_name",
    "affiliation", "citizen_rank", "birthplace", "visibility",
    "age", "gender", "height", "weight", "eyes", "hair", "skin",
    "life_path_origin", "life_path_experience", "life_path_encounter",
    "summary", "profile"
  ]) {
    assert.match(mobile, new RegExp(`\\b${field}\\b`), `mobile profile must support ${field}`);
  }

  for (const field of ["handle_kana", "age", "gender", "height", "weight", "eyes", "hair", "skin", "life_path_origin", "life_path_experience", "life_path_encounter"]) {
    assert.match(personal, new RegExp(`\\b${field}\\b`));
  }
  for (const field of ["character_name", "character_kana", "handle", "player_name", "affiliation", "citizen_rank", "summary", "profile"]) {
    assert.match(snapshot, new RegExp(`\\b${field}\\b`));
  }
});

test("mobile outfit editor exposes every canonical PC common OFC field", async () => {
  const pc = await read("js/outfit-ofc-fields.js");
  const mobileUi = await read("js/sheet-mobile-outfit-ui.js");
  const mobileModel = await read("js/sheet-mobile-outfit-model.js");

  for (const field of ["manufacturer", "page_number", "concealment_penalty"]) {
    assert.match(pc, new RegExp(`\\b${field}\\b`));
    assert.match(mobileUi, new RegExp(`\\b${field}\\b`), `mobile outfit editor must expose ${field}`);
    assert.match(mobileModel, new RegExp(`\\b${field}\\b`), `mobile outfit model must preserve ${field}`);
  }
});

test("mobile outfit editor keeps category-specific PC editable OFC fields", async () => {
  const mobileUi = await read("js/sheet-mobile-outfit-ui.js");
  for (const field of [
    "parry", "speed", "electronic_control",
    "defense_s", "defense_p", "defense_i",
    "ianus_surface", "ianus_deep", "ianus_none",
    "tron_software", "tron_support", "tron_hardware",
    "crew", "sf", "residence_entry", "residence_electric", "residence_area"
  ]) {
    assert.match(mobileUi, new RegExp(`\\b${field}\\b`), `mobile outfit editor must expose ${field}`);
  }
});
