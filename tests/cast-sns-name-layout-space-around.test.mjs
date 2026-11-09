import test from "node:test";
import assert from "node:assert/strict";
import { computeNameLayout, computeRubyUnit, READING_SCALE, READING_LETTER_SPACING_EM, NAME_GAP_EM } from "../js/cast-sns-name-layout.js";

// The ruby of the act poster: the same look as the cast view (letter spacing .2em, READING_SCALE of the base), laid out like
// `ruby-align: space-around` (js/cast-sns-name-layout.js computeRubyUnit). A deterministic measurer: every character is `size * 0.5` wide.
const measure = (text, size) => Array.from(String(text)).length * size * 0.5;

test("a reading narrower than its base is spread over the base width, half of the room at both ends", () => {
  const unit = computeRubyUnit({ text: "ABCDEFGH", reading: "ab", fontSize: 40, measure, left: 100 });
  const size = Math.round(40 * READING_SCALE * 10) / 10;
  assert.equal(unit.readingFontSize, size);
  assert.equal(unit.width, 160, "the unit is as wide as the base");
  assert.equal(unit.baseX, 100);
  assert.equal(unit.reading.spread, true);
  const advance = size * 0.5;
  const spacing = size * READING_LETTER_SPACING_EM;
  const room = (160 - (advance * 2 + spacing)) / 2;
  const [first, second] = unit.reading.glyphs;
  assert.ok(Math.abs(first.x - (100 + room / 2)) < 1e-9, "half a room before the first letter");
  assert.ok(Math.abs(second.x - (first.x + advance + spacing + room)) < 1e-9, "a whole room (plus the spacing) between the letters");
  assert.ok(Math.abs(100 + 160 - (second.x + advance) - room / 2) < 1e-9, "half a room after the last letter");
});

test("a reading wider than its base keeps its width and the base is centered in it", () => {
  const unit = computeRubyUnit({ text: "AB", reading: "abcdefghij", fontSize: 20, measure, left: 10 });
  const size = Math.round(20 * READING_SCALE * 10) / 10;
  const natural = size * 0.5 * 10 + 9 * size * READING_LETTER_SPACING_EM;
  assert.ok(Math.abs(unit.width - natural) < 1e-9);
  assert.equal(unit.baseWidth, 20);
  assert.ok(Math.abs(unit.baseX - (10 + (natural - 20) / 2)) < 1e-9, "room added left and right of the base");
  assert.equal(unit.reading.spread, false);
  assert.equal(unit.reading.glyphs[0].x, 10);
});

test("one letter of reading sits in the middle of the base; no reading leaves the base as it is", () => {
  const one = computeRubyUnit({ text: "ABCD", reading: "あ", fontSize: 30, measure, left: 0 });
  const size = Math.round(30 * READING_SCALE * 10) / 10;
  assert.ok(Math.abs(one.reading.glyphs[0].x - (60 - size * 0.5) / 2) < 1e-9);
  const none = computeRubyUnit({ text: "ABCD", reading: "  ", fontSize: 30, measure, left: 5 });
  assert.equal(none.reading, null);
  assert.equal(none.width, 60);
  assert.equal(none.baseX, 5);
});

test("space-around name layout: handle and name units side by side, the unit width is the larger of base and reading, the size is the largest that fits", () => {
  const layout = computeNameLayout({ handle: "ABCD", handleReading: "xy", name: "EF", nameReading: "abcdefghijklmnop", measure, readingMode: "space-around", minFontSize: 8, maxFontSize: 36, left: 0, rightEdge: 250 });
  assert.equal(layout.fits, true);
  assert.ok(layout.totalWidth <= 250);
  assert.ok(layout.fontSize < 36, "the width, not the maximum, decides the size");
  const bigger = computeNameLayout({ handle: "ABCD", handleReading: "xy", name: "EF", nameReading: "abcdefghijklmnop", measure, readingMode: "space-around", minFontSize: layout.fontSize + 1, maxFontSize: layout.fontSize + 1, left: 0, rightEdge: 250 });
  assert.equal(bigger.fits, false, "one size more no longer fits");
  // the quoted handle is the base of the first unit; the name starts after it and the gap
  const handleWidth = measure("“ABCD”", layout.fontSize);
  assert.equal(layout.handle.quotedWidth, handleWidth);
  const nameUnitLeft = handleWidth + layout.fontSize * NAME_GAP_EM;
  assert.ok(layout.name.x >= nameUnitLeft, "the name (centered in its long reading) starts at or after its unit's left");
  assert.ok(layout.nameReading.glyphs[0].x >= nameUnitLeft - 1e-9);
  assert.equal(layout.handleReading.spread, true);
  assert.equal(layout.nameReading.spread, false);
});

test("the default reading mode is untouched: a centered reading, no glyph list", () => {
  const layout = computeNameLayout({ handle: "ab", handleReading: "xy", name: "cd", nameReading: "zz", measure });
  assert.ok(layout.handleReading.centerX > 0);
  assert.equal(layout.handleReading.glyphs, undefined);
  assert.equal(layout.fits, undefined);
});
