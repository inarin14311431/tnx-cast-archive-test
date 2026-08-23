import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const accountLinks = await readFile(new URL("../js/account-mobile-editor-links.js", import.meta.url), "utf8");
const troopSave = await readFile(new URL("../js/troop-save-v2.js", import.meta.url), "utf8");
const troopHtml = await readFile(new URL("../troop.html", import.meta.url), "utf8");

test("account keeps acts visible and only adds troop shortcut for linked casts", () => {
  assert.match(accountLinks, /\.from\("troops"\).*\.not\("character_id", "is", null\)/s);
  assert.match(accountLinks, /linkedPublicIds\.has\(publicId\)/);
  assert.match(accountLinks, /if \(!linked\) \{\s*existing\?\.remove\(\)/s);
  assert.match(accountLinks, /owned-cast__acts/);
  assert.match(accountLinks, /owned-cast__troops/);
  assert.match(accountLinks, /grid-column: 1 \/ 3/);
});

test("troop page uses guarded save controller", () => {
  assert.match(troopHtml, /troop-save-v2\.js\?v=1/);
  assert.match(troopSave, /addEventListener\("submit", saveTroopV2, true\)/);
  assert.match(troopSave, /event\.stopImmediatePropagation\(\)/);
  assert.match(troopSave, /if \(saving\) return/);
  assert.match(troopSave, /saveButton\.disabled = active/);
  assert.match(troopSave, /location\.replace\(target\.href\)/);
  assert.match(troopSave, /\.update\(payload\)\.eq\("public_id", publicId\)\.eq\("owner_id", user\.id\)/);
  assert.match(troopSave, /\.insert\(payload\)/);
});

test("troop save persists current editor collections and disables legacy use limit", () => {
  assert.match(troopSave, /skills: \[\.\.\.generalSkills, \.\.\.styleSkills\]/);
  assert.match(troopSave, /combos: collectCombos\(\)/);
  assert.match(troopSave, /outfits: collectRows\("#troop-outfits-editor"/);
  assert.match(troopSave, /act_use_limit: null/);
  assert.match(troopSave, /experience_spent:/);
});
