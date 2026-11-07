import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { playWithFallback, resolveSceneComposition } from "../js/act-showcase-scenes.js";

// The finale (the page after the intro) is drawn through a pattern table and playWithFallback, like the intro's frames
// (docs/ACT_SHOWCASE_SCENES.md section 6, "7 の5つ目"). Only "a" exists so far, so these pin the shape pattern B plugs into.
const read = async file => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("the finale is drawn through FINALE_PATTERNS and playWithFallback; pattern a is the old renderOpening + applyBackground + renderPoster", async () => {
  const page = await read("js/act-showcase-page.js");
  assert.match(page, /const FINALE_PATTERNS = \{\s*\[DEFAULT_SCENE_PATTERN\]: renderFinaleA\s*\};/);
  assert.match(page, /await playWithFallback\(\s*FINALE_PATTERNS,\s*model\.scenes\.finale,\s*draw => draw\(model\)/);
  assert.match(page, /function renderFinaleA\(model\) \{\s*renderOpening\(model\);\s*applyBackground\(model\.background\);\s*return \{ opening, board: renderPoster\(model\) \};\s*\}/);
  // nothing else draws the finale directly
  assert.equal(page.match(/(?<!function )renderPoster\(model\)/g).length, 1);
  assert.equal(page.match(/(?<!function )renderOpening\(model\)/g).length, 1);
  // the scroll motion belongs to the pattern that has a hero and a board (initializeMotion returns when either is null)
  assert.match(page, /initializeMotion\(finale\.opening, finale\.board\)/);
  assert.match(page, /function initializeMotion\(openingSection, board\) \{\s*if \(!openingSection \|\| !board\) return;/);
});

test("the guests are fetched when ACT READY or the finale draws them itself", async () => {
  const page = await read("js/act-showcase-page.js");
  assert.match(page, /const drawsGuests = model\.scenes\.ready === "b" \|\| model\.scenes\.finale === "b";/);
  assert.match(page, /if \(isNeoTokyo && drawsGuests\) model\.guests = await loadReadyGuests\(slug\)/);
});

test("the final ACT TRAILER stands down for a finale pattern other than a, decided from the data", async () => {
  const source = await read("js/act-showcase-final-trailer.js");
  assert.match(source, /import \{ DEFAULT_SCENE_PATTERN, resolveSceneComposition \} from "\.\/act-showcase-scenes\.js/);
  const guard = source.indexOf("resolveSceneComposition(data).finale !== DEFAULT_SCENE_PATTERN");
  const mount = source.indexOf("mountAtFinalBoardTop(createTrailerSection(trailer))");
  assert.ok(guard > 0 && mount > guard, "the guard comes before the trailer is mounted");
  // while no finale pattern but a exists, a composition that asks for "b" still plays "a", so the guard changes nothing yet
  assert.equal(resolveSceneComposition({ scenes: { finale: "b" } }).finale, "a");
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
