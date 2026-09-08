import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/act-showcase-neotokyo.js", import.meta.url), "utf8");

test("NeoTokyo act title screen is paused without deleting its implementation", () => {
  assert.match(source, /const SHOW_ACT_TITLE_SCREEN = false;/);
  assert.match(source, /if \(SHOW_ACT_TITLE_SCREEN\) \{\s*await showActTitle\(state, model\);\s*if \(state\.finished\) return;\s*\}/s);
  assert.match(source, /async function showActTitle\(state, model\)/);
  assert.match(source, /await showTrailer\(state, model\);/);
});
