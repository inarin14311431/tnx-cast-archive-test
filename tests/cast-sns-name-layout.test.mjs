import test from "node:test";
import assert from "node:assert/strict";
import { computeNameLayout, approximateTextWidth, CARD_NAME_LEFT, CARD_RIGHT_EDGE, MAX_NAME_FONT_SIZE, MIN_NAME_FONT_SIZE } from "../js/cast-sns-name-layout.js";

test("short name: handle and name fit on one line at the max font size with readings centered", () => {
  const layout = computeNameLayout({
    handle: "べたべたお化け",
    handleReading: "べたべたおばけ",
    name: "躑躅",
    nameReading: "ツツジ",
    measure: approximateTextWidth
  });
  assert.equal(layout.fontSize, MAX_NAME_FONT_SIZE);
  assert.ok(layout.handle);
  assert.ok(layout.name.x > layout.handle.x + layout.handle.quotedWidth, "name starts after the quoted handle");
  assert.ok(Math.abs(layout.handleReading.centerX - layout.handle.innerCenterX) < 0.01, "handle reading centers on the inner handle text");
  assert.ok(Math.abs(layout.nameReading.centerX - layout.name.centerX) < 0.01, "name reading centers on the name text");
  assert.equal(layout.readingFontSize, Math.round(MAX_NAME_FONT_SIZE * 0.44 * 10) / 10);
});

test("long name: font size shrinks to keep the name block inside the card, readings scale with it", () => {
  const layout = computeNameLayout({
    handle: "歌わない小夜啼鳥",
    handleReading: "うたわないナイチンゲール",
    name: "アレクサンドラ・ヴェルニーナ",
    nameReading: "アレクサンドラ・ヴェルニーナ",
    measure: approximateTextWidth
  });
  assert.ok(layout.fontSize < MAX_NAME_FONT_SIZE, "font size shrank below the maximum");
  assert.ok(layout.fontSize >= MIN_NAME_FONT_SIZE);
  assert.equal(layout.readingFontSize, Math.round(layout.fontSize * 0.44 * 10) / 10);
  assert.ok(layout.nameReading.right <= CARD_RIGHT_EDGE + 0.01, "the (possibly overhanging) name reading stays clear of the card's right edge");
  assert.ok(layout.handleReading.left >= CARD_NAME_LEFT - 0.01, "the handle reading stays clear of the card's left edge");
});

test("no reading: reading boxes are omitted rather than rendered empty", () => {
  const layout = computeNameLayout({ handle: "べたべたお化け", handleReading: "", name: "躑躅", nameReading: "", measure: approximateTextWidth });
  assert.equal(layout.handleReading, null);
  assert.equal(layout.nameReading, null);
});

test("no handle: the name alone starts at the card's left edge and has no handle box", () => {
  const layout = computeNameLayout({ handle: "", handleReading: "", name: "躑躅", nameReading: "ツツジ", measure: approximateTextWidth });
  assert.equal(layout.handle, null);
  assert.equal(layout.handleReading, null);
  assert.equal(layout.name.x, CARD_NAME_LEFT);
  assert.ok(layout.nameReading);
});

test("an 18-character name never overflows the card's right edge (x=1135), name or reading", () => {
  const layout = computeNameLayout({
    handle: "歌わない小夜啼鳥",
    handleReading: "うたわないナイチンゲール",
    name: "アレクサンドラ・ヴェルニーナ＝クロフ",
    nameReading: "アレクサンドラ・ヴェルニーナ＝クロフ",
    measure: approximateTextWidth
  });
  assert.ok(layout.name.x + layout.name.width <= CARD_RIGHT_EDGE + 0.01, `name text overflows: ${layout.name.x + layout.name.width}`);
  assert.ok(layout.nameReading.right <= CARD_RIGHT_EDGE + 0.01, `name reading overflows: ${layout.nameReading.right}`);
  assert.ok(layout.fontSize >= MIN_NAME_FONT_SIZE && layout.fontSize <= MAX_NAME_FONT_SIZE);
});

test("overlapping readings are pushed apart rather than left to collide", () => {
  const layout = computeNameLayout({
    handle: "べ",
    handleReading: "ながいよみがな",
    name: "べ",
    nameReading: "ながいよみがな",
    measure: approximateTextWidth
  });
  assert.ok(layout.handleReading.right <= layout.nameReading.left + 0.01, "readings no longer overlap after the push-apart step");
  assert.ok(layout.nameReading.right <= CARD_RIGHT_EDGE + 0.01, "pushing the name reading clear of the handle reading keeps it inside the card");
});
