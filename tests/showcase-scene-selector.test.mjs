import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";
import { createFakeDocument } from "./helpers/fake-dom.mjs";
import { SCENE_FRAMES, SCENE_PATTERNS, parseSceneSelectionField, resolveSceneComposition } from "../js/act-showcase-scenes.js";
import {
  SCENE_FRAME_LABELS,
  SCENE_PATTERN_NAMES,
  fieldAfterChoice,
  fieldAfterReset,
  mountSceneSelector,
  patternLabel,
  selectableFrames,
  shownPattern
} from "../js/showcase-scene-selector.js";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

// frames that can already play more than "a": title (a, b) and ready (a, b, c); the rest stay a-only
const PATTERNS = { ...Object.fromEntries(SCENE_FRAMES.map(frame => [frame, ["a"]])), title: ["a", "b"], ready: ["a", "b", "c"] };

function mount(patterns = PATTERNS, fieldValue = "") {
  const doc = createFakeDocument();
  const host = doc.createElement("details");
  host.hidden = true;
  const summary = doc.createElement("em");
  summary.dataset.sceneSummary = "true";
  const field = doc.createElement("input");
  field.value = fieldValue;
  host.append(summary, field);
  const api = mountSceneSelector({ host, field, patterns, doc });
  const buttons = () => host.querySelectorAll("button[data-scene-frame]");
  const frameButtons = frame => buttons().filter(item => item.dataset.sceneFrame === frame);
  const button = (frame, pattern) => frameButtons(frame).find(item => item.dataset.scenePattern === pattern);
  // the pattern a frame shows as chosen: the one button with aria-pressed
  const shown = frame => frameButtons(frame).find(item => item.getAttribute("aria-pressed") === "true")?.dataset.scenePattern;
  const frames = () => [...new Set(buttons().map(item => item.dataset.sceneFrame))];
  const change = (frame, value) => button(frame, value).click();
  const reset = () => host.querySelectorAll("button[data-scene-reset]")[0].click();
  const restore = text => { field.value = text; field.dispatchEvent({ type: "input" }); };
  return { host, field, summary, api, buttons, button, frameButtons, shown, frames, change, reset, restore };
}

test("while every frame can play only a, nothing is offered and the block stays hidden", () => {
  const onlyA = Object.fromEntries(SCENE_FRAMES.map(frame => [frame, ["a"]]));
  assert.deepEqual(selectableFrames(onlyA), []);
  const { host, buttons, api } = mount(onlyA);
  assert.equal(host.hidden, true);
  assert.equal(buttons().length, 0);
  assert.deepEqual(api.frames, []);
});

test("every frame has a label", () => {
  assert.deepEqual(Object.keys(SCENE_FRAME_LABELS), SCENE_FRAMES);
});

test("a frame gets its buttons as soon as it can play a second pattern, in frame order, with one button per pattern", () => {
  assert.deepEqual(selectableFrames(PATTERNS), [{ frame: "title", patterns: ["a", "b"] }, { frame: "ready", patterns: ["a", "b", "c"] }]);
  const { host, frames, frameButtons, shown } = mount();
  assert.equal(host.hidden, false);
  assert.deepEqual(frames(), ["title", "ready"]);
  assert.deepEqual(frameButtons("title").map(item => item.dataset.scenePattern), ["a", "b"]);
  assert.deepEqual(frameButtons("ready").map(item => item.dataset.scenePattern), ["a", "b", "c"]);
  assert.deepEqual(frameButtons("title").map(item => item.textContent), ["A 標準", "B:タイトルカード"]);
  assert.deepEqual(frameButtons("ready").map(item => item.textContent), ["A 標準", "B:ポートレート中央", "パターン C"]);
  assert.equal(shown("title"), "a");
});

test("each pattern has the name it was decided under, and a pattern without one is shown by its letter", () => {
  assert.deepEqual(Object.keys(SCENE_PATTERN_NAMES), SCENE_FRAMES);
  assert.equal(patternLabel("loading", "b"), "B:起動ターミナル");
  assert.equal(patternLabel("trailer", "b"), "B:縦組み");
  assert.equal(patternLabel("handout-assign", "b"), "B:ポートレート先行");
  assert.equal(patternLabel("finale", "b"), "B:キービジュアル");
  assert.equal(patternLabel("finale", "a"), "A 標準");
  assert.equal(patternLabel("finale", "c"), "パターン C");
});

test("choosing a pattern writes it to the field, and choosing a again removes it", () => {
  const { field, change } = mount();
  change("title", "b");
  assert.equal(field.value, '{"title":"b"}');
  change("ready", "c");
  assert.deepEqual(parseSceneSelectionField(field.value), { title: "b", ready: "c" });
  change("title", "a");
  assert.equal(field.value, '{"ready":"c"}');
  change("ready", "a");
  assert.equal(field.value, "", "all a is an empty field, which publishes no scenes key");
});

test("restoring an act (the field is written and fires input) updates the buttons and the summary", () => {
  const { shown, restore, summary } = mount();
  restore('{"title":"b","ready":"c"}');
  assert.equal(shown("title"), "b");
  assert.equal(shown("ready"), "c");
  assert.equal(summary.textContent, "B:タイトル / C:ACT READY / ほかは A");
  restore("");
  assert.equal(shown("title"), "a");
  assert.equal(shown("ready"), "a");
  assert.equal(summary.textContent, "すべて A(標準)");
});

test("a field that is already filled when the selector is mounted is shown", () => {
  const { shown } = mount(PATTERNS, '{"ready":"b"}');
  assert.equal(shown("ready"), "b");
  assert.equal(shown("title"), "a");
});

test("a stored pattern the frame cannot play yet is not shown, and it survives editing another frame", () => {
  // finale can only play a here, so it has no buttons, but "finale": "b" was stored by a newer script
  const { field, frames, shown, change } = mount(PATTERNS, '{"finale":"b","title":"c"}');
  assert.ok(!frames().includes("finale"));
  assert.equal(shown("title"), "a", "title cannot play c: the buttons show a");
  change("ready", "b");
  assert.deepEqual(parseSceneSelectionField(field.value), { title: "c", ready: "b", finale: "b" });
});

test("round trip: pick, publish, restore into a fresh generator, and the same choices come back", () => {
  const first = mount();
  first.change("title", "b");
  first.change("ready", "c");
  const published = parseSceneSelectionField(first.field.value);          // what publish adds as showcaseData.scenes
  assert.deepEqual(published, { title: "b", ready: "c" });
  const second = mount();
  second.restore(JSON.stringify(published));                               // what restore writes back (formatSceneSelectionField)
  assert.equal(second.shown("title"), "b");
  assert.equal(second.shown("ready"), "c");
  assert.deepEqual(parseSceneSelectionField(second.field.value), published);
  assert.deepEqual(resolveSceneComposition({ scenes: published }, { patterns: PATTERNS }).title, "b");
});

test("pure helpers", () => {
  assert.equal(shownPattern('{"title":"b"}', "title", ["a", "b"]), "b");
  assert.equal(shownPattern('{"title":"c"}', "title", ["a", "b"]), "a");
  assert.equal(shownPattern("", "title", ["a", "b"]), "a");
  assert.equal(fieldAfterChoice("", "title", "b"), '{"title":"b"}');
  assert.equal(fieldAfterChoice('{"title":"b"}', "title", "a"), "");
  assert.equal(fieldAfterChoice("not json", "ready", "c"), '{"ready":"c"}');
});

test("\"すべて A に戻す\" puts every shown frame back to a and keeps what a newer script stored", () => {
  const { field, shown, reset } = mount(PATTERNS, '{"title":"b","ready":"c","finale":"b"}');
  assert.equal(shown("title"), "b");
  reset();
  assert.deepEqual(parseSceneSelectionField(field.value), { finale: "b" });
  assert.equal(shown("title"), "a");
  assert.equal(shown("ready"), "a");
  assert.equal(fieldAfterReset('{"title":"b"}', PATTERNS), "");
  assert.equal(fieldAfterReset("", PATTERNS), "");
  // title stored as c cannot play c: it is shown as a, so a reset leaves it alone
  assert.equal(fieldAfterReset('{"title":"c"}', PATTERNS), '{"title":"c"}');
});

test("a missing host or field mounts nothing", () => {
  const doc = createFakeDocument();
  assert.equal(mountSceneSelector({ host: null, field: doc.createElement("input"), doc }), null);
  assert.equal(mountSceneSelector({ host: doc.createElement("details"), field: null, doc }), null);
});

test("the real SCENE_PATTERNS offers two choices, pattern b of the loading, title, trailer, handout-assign, ready and finale frames", () => {
  assert.deepEqual(selectableFrames(), [{ frame: "loading", patterns: ["a", "b"] }, { frame: "title", patterns: ["a", "b"] }, { frame: "trailer", patterns: ["a", "b"] }, { frame: "handout-assign", patterns: ["a", "b"] }, { frame: "ready", patterns: ["a", "b"] }, { frame: "finale", patterns: ["a", "b"] }]);
});

test("the generator page has the hidden fieldset with the one hidden field in it, and the loader mounts the selector", async () => {
  const html = await read("showcase-generator.html");
  assert.match(html, /<details id="showcase-scene-composition"[^>]*\bhidden\b[^>]*>[\s\S]*?<input id="showcase-scenes" type="hidden" value="">[\s\S]*?<\/details>/);
  assert.match(html, /<b class="look-scenes__badge">豪華版のみ<\/b>/);
  assert.match(html, /data-scene-summary/);
  assert.equal([...html.matchAll(/id="showcase-scenes"/g)].length, 1);
  const loader = await read("js/showcase-generator-loader.js");
  assertVersionedMatch(loader, /await import\("\.\/showcase-scene-selector\.js\?v=VERSION"\)/);
  const source = await read("js/showcase-scene-selector.js");
  assertVersionedMatch(source, /from "\.\/act-showcase-scenes\.js\?v=VERSION"/);
  assert.match(source, /querySelector\("#showcase-scene-composition"\)/);
  assert.match(source, /querySelector\("#showcase-scenes"\)/);
});
