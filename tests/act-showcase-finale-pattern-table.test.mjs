import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { playWithFallback, resolveSceneComposition } from "../js/act-showcase-scenes.js";

// The finale (the page after the intro) is drawn through a pattern table and playWithFallback, like the intro's frames
// (docs/ACT_SHOWCASE_SCENES.md section 6, "7 の5つ目"): pattern a is the old drawing, pattern b the key visual (tests/act-showcase-finale-b-css.test.mjs).
const read = async file => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("the finale is drawn through FINALE_PATTERNS and playWithFallback; pattern a is the old renderOpening + applyBackground + renderPoster", async () => {
  const page = await read("js/act-showcase-page.js");
  assert.match(page, /const FINALE_PATTERNS = \{\s*\[DEFAULT_SCENE_PATTERN\]: renderFinaleA,\s*b: renderFinaleB\s*\};/);
  assert.match(page, /await playWithFallback\(\s*FINALE_PATTERNS,\s*model\.scenes\.finale,\s*draw => draw\(model\)/);
  assert.match(page, /function renderFinaleA\(model\) \{\s*renderOpening\(model\);\s*applyBackground\(model\.background\);\s*return \{ opening, board: renderPoster\(model\) \};\s*\}/);
  // nothing else draws the finale directly
  assert.equal(page.match(/(?<!function )renderPoster\(model\)/g).length, 1);
  assert.equal(page.match(/(?<!function )renderOpening\(model\)/g).length, 1);
  // the scroll motion belongs to the pattern that has a hero and a board (initializeMotion returns when either is null)
  assert.match(page, /initializeMotion\(finale\.opening, finale\.board\)/);
  assert.match(page, /function initializeMotion\(openingSection, board\) \{\s*if \(!openingSection \|\| !board\) return;/);
});

test("the guests are fetched when the boot log of LOADING, ACT READY or the finale draws them itself", async () => {
  const page = await read("js/act-showcase-page.js");
  // one fetch: ACT READY B gets the display names, finale B and the boot log of LOADING B the rows as published (portrait, persona style, data, summary)
  assert.match(page, /const drawsGuests = model\.scenes\.loading === "b" \|\| model\.scenes\.ready === "b" \|\| model\.scenes\.finale === "b";/);
  assert.match(page, /if \(isNeoTokyo && drawsGuests\) \{\s*const guestRows = await loadGuestRows\(slug\);\s*model\.guests = normalizeReadyGuests\(guestRows\);\s*model\.guestRows = guestRows;\s*\}/);
  // a guest list that fails or is slow (2 s) is left out
  assert.match(page, /async function loadGuestRows\(slug\) \{\s*const timeout = new Promise\(resolve => setTimeout\(\(\) => resolve\(\[\]\), 2000\)\);/);
  assert.match(page, /loadPublicShowcaseGuests\(slug\)\.then\(result => \(Array\.isArray\(result\) \? result : \[\]\), \(\) => \[\]\)/);
});

test("the final ACT TRAILER stands down once the page plays a pattern other than a, decided from what the page did (not from the data), so a failing B that falls back to A still gets it", async () => {
  const source = await read("js/act-showcase-final-trailer.js");
  assert.doesNotMatch(source, /resolveSceneComposition/, "not decided from the data");
  assert.match(source, /const pagePlaysAnotherPattern = \(\) => document\.getElementById\("act-showcase-root"\)\?\.getAttribute\("data-scene-pattern"\) !== "a";/);
  // it does not even start to wait when the page already is pattern B, and an observer that is waiting lets go when the page becomes pattern B
  assert.match(source, /if \(mount\(\) \|\| pagePlaysAnotherPattern\(\)\) return;/);
  assert.match(source, /if \(!mount\(\) && !pagePlaysAnotherPattern\(\)\) return;\s*observer\.disconnect\(\);/);
  // the page marks the root as pattern b only after it has built pattern B (a failure before leaves "a")
  const page = await read("js/act-showcase-page.js");
  assert.match(page, /root\.setAttribute\("data-scene-pattern", "b"\)/);
  assert.equal(resolveSceneComposition({ scenes: { finale: "b" } }, { patterns: { finale: ["a", "b"] } }).finale, "b");
});

test("a finale pattern that throws plays a on the page it did not touch; a failing a is not hidden", async () => {
  const log = [];
  const patterns = {
    a: model => { log.push("a"); return { opening: "hero", board: "board", model }; },
    b: () => { throw new Error("b failed"); }
  };
  const reported = [];
  const result = await playWithFallback(patterns, "b", draw => draw({ actName: "X" }), (error, pattern) => reported.push([error.message, pattern]));
  assert.deepEqual(log, ["a"]);
  assert.deepEqual(result, { opening: "hero", board: "board", model: { actName: "X" } });
  assert.deepEqual(reported, [["b failed", "b"]]);
  await assert.rejects(() => playWithFallback({ a: () => { throw new Error("a failed"); } }, "a", draw => draw({})), /a failed/);
  // a composition with no finale key (every showcase published before compositions) plays a
  const ran = [];
  await playWithFallback({ a: () => ran.push("a"), b: () => ran.push("b") }, resolveSceneComposition({}).finale, draw => draw());
  assert.deepEqual(ran, ["a"]);
});
