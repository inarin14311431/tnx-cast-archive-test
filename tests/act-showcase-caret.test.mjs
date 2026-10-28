import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { lastCharRect, scrollDeltaToKeepVisible, textAxis } from "../js/act-showcase-caret.js";

const rect = (left, top, width = 18, height = 20) => ({ left, top, right: left + width, bottom: top + height, width, height });
const box = { left: 100, top: 100, right: 400, bottom: 300 };

test("horizontal text (axis y): scrolls down only when the caret's line reaches the bottom padding", () => {
  assert.deepEqual(scrollDeltaToKeepVisible(rect(150, 150), box, { axis: "y", padding: 12 }), { x: 0, y: 0 });
  assert.deepEqual(scrollDeltaToKeepVisible(rect(150, 285), box, { axis: "y", padding: 12 }), { x: 0, y: 17 });
  assert.deepEqual(scrollDeltaToKeepVisible(rect(150, 90), box, { axis: "y", padding: 12 }), { x: 0, y: -22 });
});

test("vertical text (axis x): columns grow leftward, so the box scrolls left (negative) when the caret passes the left padding", () => {
  assert.deepEqual(scrollDeltaToKeepVisible(rect(250, 150), box, { axis: "x", padding: 12 }), { x: 0, y: 0 });
  assert.deepEqual(scrollDeltaToKeepVisible(rect(105, 150), box, { axis: "x", padding: 12 }), { x: -7, y: 0 });
});

test("vertical text: a caret that starts beyond the right edge (a narrow box) scrolls right (positive)", () => {
  assert.deepEqual(scrollDeltaToKeepVisible(rect(451, 150), { ...box, right: 336 }, { axis: "x", padding: 12 }), { x: 451 + 18 - (336 - 12), y: 0 });
});

test("nothing to do without a caret or a box", () => {
  assert.deepEqual(scrollDeltaToKeepVisible(null, box), { x: 0, y: 0 });
  assert.deepEqual(scrollDeltaToKeepVisible(rect(0, 0), null), { x: 0, y: 0 });
});

test("lastCharRect reads the last character of the read text and skips empty rects", () => {
  const calls = [];
  globalThis.document = {
    createRange: () => ({
      setStart: (node, offset) => calls.push(["start", offset]),
      setEnd: (node, offset) => calls.push(["end", offset]),
      getClientRects: () => [rect(10, 10), rect(30, 10, 0, 20), rect(50, 10)]
    })
  };
  try {
    assert.equal(lastCharRect({ length: 0 }), null);
    assert.equal(lastCharRect(null), null);
    assert.equal(lastCharRect({ length: 5 }).left, 50);
    assert.deepEqual(calls, [["start", 4], ["end", 5]]);
  } finally {
    delete globalThis.document;
  }
});

test("the text's own writing mode decides the axis, not the scrolling box's", () => {
  globalThis.getComputedStyle = element => ({ writingMode: element.mode });
  try {
    assert.equal(textAxis({ parentElement: { mode: "vertical-rl" } }), "x");
    assert.equal(textAxis({ parentElement: { mode: "horizontal-tb" } }), "y");
    assert.equal(textAxis({}), "y");
  } finally {
    delete globalThis.getComputedStyle;
  }
});

test("pattern A's ACT TRAILER keeps following the caret by itself: typeSplitReadout reports each step only to a caller that asks", async () => {
  const source = await readFile(new URL("../js/act-showcase-neotokyo.js", import.meta.url), "utf8");
  const showTrailer = source.slice(source.indexOf("async function showTrailer("), source.indexOf("async function showTrailerB("));
  assert.match(showTrailer, /typeSplitReadout\(state, readout, 4200, 34\)/);
  assert.doesNotMatch(showTrailer, /onStep|keepCaretVisible/);
  const type = source.slice(source.indexOf("async function typeSplitReadout("), source.indexOf("function wait("));
  assert.match(type, /maxInterval = 24, onStep = null/);
  assert.equal((type.match(/onStep\?\.\(\)/g) || []).length, 2, "after every typed step and once when the reading ends");
  assert.match(type, /delete target\.dataset\.typing;\s*onStep\?\.\(\);/);
});
