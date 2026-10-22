import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SCENE_PATTERN,
  SCENE_FRAMES,
  SCENE_PATTERNS,
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
