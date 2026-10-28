import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";
import { createFakeDocument } from "./helpers/fake-dom.mjs";
import { SCENE_FRAMES, SCENE_PATTERNS, parseSceneSelectionField, resolveSceneComposition } from "../js/act-showcase-scenes.js";
import {
  SCENE_FRAME_LABELS,
  fieldAfterChoice,
  mountSceneSelector,
  selectableFrames,
  shownPattern
} from "../js/showcase-scene-selector.js";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

// frames that can already play more than "a": title (a, b) and ready (a, b, c); the rest stay a-only
const PATTERNS = { ...Object.fromEntries(SCENE_FRAMES.map(frame => [frame, ["a"]])), title: ["a", "b"], ready: ["a", "b", "c"] };

function mount(patterns = PATTERNS, fieldValue = "") {
  const doc = createFakeDocument();
  const host = doc.createElement("fieldset");
  host.hidden = true;
  const field = doc.createElement("input");
  field.value = fieldValue;
  host.append(field);
  const api = mountSceneSelector({ host, field, patterns, doc });
  const selects = () => host.querySelectorAll("select[data-scene-frame]");
  const select = frame => selects().find(item => item.dataset.sceneFrame === frame);
  const change = (frame, value) => { const target = select(frame); target.value = value; target.dispatchEvent({ type: "change" }); };
  const restore = text => { field.value = text; field.dispatchEvent({ type: "input" }); };
  return { host, field, api, selects, select, change, restore };
}

test("while every frame can play only a, nothing is offered and the fieldset stays hidden", () => {
  const onlyA = Object.fromEntries(SCENE_FRAMES.map(frame => [frame, ["a"]]));
  assert.deepEqual(selectableFrames(onlyA), []);
  const { host, selects, api } = mount(onlyA);
  assert.equal(host.hidden, true);
  assert.equal(selects().length, 0);
  assert.deepEqual(api.frames, []);
});

test("every frame has a label", () => {
  assert.deepEqual(Object.keys(SCENE_FRAME_LABELS), SCENE_FRAMES);
});

test("a frame gets a select as soon as it can play a second pattern, in frame order, with one option per pattern", () => {
  assert.deepEqual(selectableFrames(PATTERNS), [{ frame: "title", patterns: ["a", "b"] }, { frame: "ready", patterns: ["a", "b", "c"] }]);
  const { host, selects, select } = mount();
  assert.equal(host.hidden, false);
  assert.deepEqual(selects().map(item => item.dataset.sceneFrame), ["title", "ready"]);
  assert.deepEqual(select("title").options.map(option => option.value), ["a", "b"]);
  assert.deepEqual(select("ready").options.map(option => option.value), ["a", "b", "c"]);
  assert.equal(select("title").value, "a");
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

test("restoring an act (the field is written and fires input) updates the selects", () => {
  const { select, restore } = mount();
  restore('{"title":"b","ready":"c"}');
  assert.equal(select("title").value, "b");
  assert.equal(select("ready").value, "c");
  restore("");
  assert.equal(select("title").value, "a");
  assert.equal(select("ready").value, "a");
});

test("a field that is already filled when the selector is mounted is shown", () => {
  const { select } = mount(PATTERNS, '{"ready":"b"}');
  assert.equal(select("ready").value, "b");
  assert.equal(select("title").value, "a");
});

test("a stored pattern the frame cannot play yet is not shown, and it survives editing another frame", () => {
  // finale can only play a here, so it has no select, but "finale": "b" was stored by a newer script
  const { field, select, change } = mount(PATTERNS, '{"finale":"b","title":"c"}');
  assert.equal(select("finale"), undefined);
  assert.equal(select("title").value, "a", "title cannot play c: the select shows a");
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
  assert.equal(second.select("title").value, "b");
  assert.equal(second.select("ready").value, "c");
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

test("a missing host or field mounts nothing", () => {
  const doc = createFakeDocument();
  assert.equal(mountSceneSelector({ host: null, field: doc.createElement("input"), doc }), null);
  assert.equal(mountSceneSelector({ host: doc.createElement("fieldset"), field: null, doc }), null);
});

test("the real SCENE_PATTERNS offers one choice, the trailer frame's pattern b; every other frame has only a", () => {
  assert.deepEqual(selectableFrames(), [{ frame: "trailer", patterns: ["a", "b"] }]);
});

test("the generator page has the hidden fieldset with the one hidden field in it, and the loader mounts the selector", async () => {
  const html = await read("showcase-generator.html");
  assert.match(html, /<fieldset id="showcase-scene-composition"[^>]*\bhidden\b[^>]*>[\s\S]*?<input id="showcase-scenes" type="hidden" value="">[\s\S]*?<\/fieldset>/);
  assert.equal([...html.matchAll(/id="showcase-scenes"/g)].length, 1);
  const loader = await read("js/showcase-generator-loader.js");
  assertVersionedMatch(loader, /await import\("\.\/showcase-scene-selector\.js\?v=VERSION"\)/);
  const source = await read("js/showcase-scene-selector.js");
  assertVersionedMatch(source, /from "\.\/act-showcase-scenes\.js\?v=VERSION"/);
  assert.match(source, /querySelector\("#showcase-scene-composition"\)/);
  assert.match(source, /querySelector\("#showcase-scenes"\)/);
});
