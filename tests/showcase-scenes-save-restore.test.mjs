import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

// The composition (showcase_data.scenes, docs/ACT_SHOWCASE_SCENES.md section 6 #6) travels through the generator in one hidden
// field. The functions are tested in act-showcase-scenes.test.mjs; this checks the three places that connect them.

test("the generator has one hidden field for the scene selection", async () => {
  const html = await read("showcase-generator.html");
  assert.equal([...html.matchAll(/id="showcase-scenes"/g)].length, 1);
  assert.match(html, /<input id="showcase-scenes" type="hidden" value="">/);
});

test("restoring an owned showcase writes the stored composition into the field, also when there is none", async () => {
  const source = await read("js/showcase-edit-restore.js");
  assertVersionedMatch(source, /import \{ formatSceneSelectionField \} from "\.\/act-showcase-scenes\.js\?v=VERSION"/);
  assert.match(source, /showcaseScenes: document\.querySelector\("#showcase-scenes"\)/);
  assert.match(source, /setField\(elements\.showcaseScenes, formatSceneSelectionField\(showcase\.scenes\)\)/);
});

test("publishing reads the field for both modes and adds scenes only when a frame is not a", async () => {
  const source = await read("js/showcase-dynamic-publish-v3.js");
  assertVersionedMatch(source, /import \{ parseSceneSelectionField \} from "\.\/act-showcase-scenes\.js\?v=VERSION"/);
  assert.match(source, /showcaseScenesField = document\.querySelector\("#showcase-scenes"\)/);
  assert.match(source, /const scenes = parseSceneSelectionField\(showcaseScenesField\?\.value\);\s+if \(Object\.keys\(scenes\)\.length\) showcaseData\.scenes = scenes;/);
  // one publish function serves both modes, so the composition is carried over for the standard one too
  assert.equal([...source.matchAll(/showcaseData\.scenes =/g)].length, 1);
  assert.match(source, /async function publishDynamicShowcase\(button, mode\)/);
});

test("the database is not asked to know about scenes: the publish function stores any showcase_data object as it is", async () => {
  const sql = await read("supabase/20_dynamic_act_showcase.sql");
  assert.match(sql, /set showcase_data = p_showcase_data/);
  assert.ok(!/scenes/.test(sql), "no scenes handling in the publish function");
});
