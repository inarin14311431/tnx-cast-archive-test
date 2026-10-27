import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SCENE_PATTERN,
  SCENE_FRAMES,
  SCENE_PATTERNS,
  formatSceneSelectionField,
  normalizeSceneSelection,
  parseSceneSelectionField,
  resolveSceneComposition
} from "../js/act-showcase-scenes.js";

const ALL_A = { loading: "a", title: "a", trailer: "a", "handout-assign": "a", ready: "a", finale: "a" };
// a frame set where every frame can already play b and c, to check how a composition is read once they exist
const ABC = Object.fromEntries(SCENE_FRAMES.map(frame => [frame, ["a", "b", "c"]]));

test("six frames in a fixed order (docs/ACT_SHOWCASE_SCENES.md §6.1); handout and assign are one frame", () => {
  assert.deepEqual(SCENE_FRAMES, ["loading", "title", "trailer", "handout-assign", "ready", "finale"]);
  assert.ok(Object.isFrozen(SCENE_FRAMES));
});

test("only pattern a exists for now, on every frame", () => {
  assert.equal(DEFAULT_SCENE_PATTERN, "a");
  assert.deepEqual(Object.keys(SCENE_PATTERNS), SCENE_FRAMES);
  for (const frame of SCENE_FRAMES) assert.deepEqual(SCENE_PATTERNS[frame], ["a"]);
});

test("a showcase published before compositions existed plays every frame as a", () => {
  for (const data of [{ casts: [{}], theme: "nova" }, {}, null, undefined, "nova", [], 3]) {
    assert.deepEqual(resolveSceneComposition(data), ALL_A, `data: ${JSON.stringify(data)}`);
  }
});

test("scenes that is not a plain object is ignored as a whole", () => {
  for (const scenes of [null, "b", ["b", "b"], 1, true]) {
    assert.deepEqual(resolveSceneComposition({ scenes }), ALL_A, `scenes: ${JSON.stringify(scenes)}`);
  }
});

test("the result lists every frame in order and cannot be changed", () => {
  const composition = resolveSceneComposition({ scenes: { finale: "a", loading: "a" } });
  assert.deepEqual(Object.keys(composition), SCENE_FRAMES);
  assert.ok(Object.isFrozen(composition));
});

test("a pattern the frame cannot play yet falls back to a (b and c are not implemented)", () => {
  assert.deepEqual(resolveSceneComposition({ scenes: { title: "b", ready: "c" } }), ALL_A);
});

test("with b and c available, each frame takes its own pattern and the rest stay a", () => {
  assert.deepEqual(
    resolveSceneComposition({ scenes: { title: "b", "handout-assign": "c" } }, { patterns: ABC }),
    { ...ALL_A, title: "b", "handout-assign": "c" }
  );
});

test("pattern names ignore case and surrounding spaces", () => {
  assert.deepEqual(
    resolveSceneComposition({ scenes: { trailer: " B ", finale: "C" } }, { patterns: ABC }),
    { ...ALL_A, trailer: "b", finale: "c" }
  );
});

test("values that are not pattern names fall back to a, frame by frame", () => {
  const scenes = { loading: "", title: 2, trailer: null, "handout-assign": { pattern: "b" }, ready: ["b"], finale: "z" };
  assert.deepEqual(resolveSceneComposition({ scenes }, { patterns: ABC }), ALL_A);
});

test("unknown frame keys and the old split handout / assign keys are ignored", () => {
  const scenes = { handout: "b", assign: "b", opening: "b", summary: "b", board: "b" };
  assert.deepEqual(resolveSceneComposition({ scenes }, { patterns: ABC }), ALL_A);
});

test("keys inherited from the prototype are not read as frames", () => {
  const scenes = Object.create({ title: "b" });
  assert.deepEqual(resolveSceneComposition({ scenes }, { patterns: ABC }), ALL_A);
});

// ---- saving and restoring the composition (the generator side)

test("the selection keeps only frames that are not a, in frame order, with names normalised", () => {
  assert.deepEqual(
    normalizeSceneSelection({ finale: " C ", title: "B", ready: "a", loading: "A", "handout-assign": "b" }),
    { title: "b", "handout-assign": "b", finale: "c" }
  );
  assert.deepEqual(Object.keys(normalizeSceneSelection({ finale: "c", title: "b" })), ["title", "finale"]);
});

test("a selection of all a, or of nothing usable, is empty", () => {
  for (const value of [{}, null, undefined, "b", ["b"], 3, { title: "a" }, { bogus: "b" }, { handout: "b", assign: "b" }, { title: "" }, { title: 2 }, { title: "has space" }, { title: "x".repeat(17) }]) {
    assert.deepEqual(normalizeSceneSelection(value), {}, JSON.stringify(value));
  }
});

test("a pattern the frame cannot play yet is kept as written (the reader plays a for it until it exists)", () => {
  const stored = { title: "b", ready: "c" };
  assert.deepEqual(normalizeSceneSelection(stored), stored);
  assert.deepEqual(resolveSceneComposition({ scenes: stored }), ALL_A);
});

test("keys inherited from the prototype are not taken into the selection", () => {
  assert.deepEqual(normalizeSceneSelection(Object.create({ title: "b" })), {});
});

test("the hidden field holds the selection as JSON, and an empty selection as an empty string", () => {
  assert.equal(formatSceneSelectionField({}), "");
  assert.equal(formatSceneSelectionField(undefined), "");
  assert.equal(formatSceneSelectionField({ title: "a" }), "");
  assert.equal(formatSceneSelectionField({ title: "b" }), '{"title":"b"}');
  assert.deepEqual(parseSceneSelectionField('{"title":"b","finale":"c"}'), { title: "b", finale: "c" });
});

test("an empty, broken or non-object field reads as no selection", () => {
  for (const text of ["", "   ", undefined, null, "{", "not json", "[]", '"b"', "3", "null", '{"bogus":"b"}']) {
    assert.deepEqual(parseSceneSelectionField(text), {}, String(text));
  }
});

test("round trip: restore writes the field, publish reads it back, and the page plays the same composition", () => {
  const stored = { version: 2, scenes: { title: "B", "handout-assign": " c ", ready: "a", finale: 3, bogus: "b" } };
  const field = formatSceneSelectionField(stored.scenes);              // restore: showcase_data.scenes -> #showcase-scenes
  const published = parseSceneSelectionField(field);                   // publish: #showcase-scenes -> showcase_data.scenes
  assert.deepEqual(published, { title: "b", "handout-assign": "c" });
  assert.deepEqual(resolveSceneComposition({ scenes: published }, { patterns: ABC }), resolveSceneComposition(stored, { patterns: ABC }));
  assert.equal(formatSceneSelectionField(published), field, "publishing again does not change the field");
});

test("round trip: a showcase without a scenes key stays without one", () => {
  for (const stored of [{ casts: [{}] }, { casts: [{}], scenes: {} }, { casts: [{}], scenes: { title: "a" } }]) {
    assert.equal(formatSceneSelectionField(stored.scenes), "");
    assert.deepEqual(parseSceneSelectionField(formatSceneSelectionField(stored.scenes)), {});
  }
});

