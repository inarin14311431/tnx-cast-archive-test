import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { countHardcodedColors } from "../scripts/hardcoded-colors-lib.mjs";
import {
  buildPosterModel, layoutPoster, defaultCatchCopy, splitReading, splitDate, deriveAuxiliaryColor, hoColor, readableOnDark, posterImageUrl,
  POSTER_DEFAULT_DATE, POSTER_RIGHTS_NOTICE, POSTER_COPYRIGHT_NOTICE, ONE_LINE_MIN_FONT, TWO_LINE_FONT, PLATE_TOP_ONE_LINE, PLATE_TOP_TWO_LINE, ROLE_TITLE
} from "../js/act-poster-layout.js";

// The announcement poster's model and layout (js/act-poster-layout.js). The measurer is a deterministic mock: every character is `size * k` wide
// (k is chosen per test), so the layout can be checked without a canvas.
const THEME = Object.freeze({ primary: "#70eaff", secondary: "#9a78ff", accent: "#ffbd68" });
const measureWith = k => (text, size) => Array.from(String(text)).length * size * k;

const cast = (slot, fullName, reading, role, extra = {}) => ({
  slot, fullName, reading, imageUrl: "https://example.test/a.png",
  styles: [{ label: `${role}◎`, handoutRole: true }, { label: "カゼ●", handoutRole: false }, { label: "ニューロ", handoutRole: false }],
  handout: { title: "『x』用ハンドアウト", body: "ここはハンドアウト本文" },
  ...extra
});
const CASTS = [
  cast("CAST 01", "“EX-Rookie” ルカ 日向", "“ニューゲーム” ヒュウガ ルカ", "カブト"),
  cast("CAST 02", "“１０倍速” ツルツル", "“１０ぷんかかる” ツルツル", "トーキー"),
  cast("CAST 03", "“電脳女神” 水無瀬 泉", "“Deus ex Auxilio” イズミ", "ニューロ"),
  cast("CAST 04", "“野良猫” 久遠寺 レイ", "“のらねこ” くおんじ れい", "カゲ"),
  cast("CAST 05", "“五号” 五郎", "ゴロウ", "カブキ"),
  cast("CAST 06", "六号", "", "マネキン")
];
const SHOWCASE = { actName: "NEON AFTERIMAGE", heroSubTitle: "ネオンの残像", rulerName: "稲荷秋", scenarioWriterName: "芳賀琉", trailer: { title: "予告", body: "一行目\n\n運命の扉は、いつだって突然開く。\n\n" }, casts: CASTS };
const modelOf = (count, extra = {}) => buildPosterModel({ ...SHOWCASE, casts: CASTS.slice(0, count), ...extra }, { date: "11.23 SUN 21:00〜" });

test("a cast is read like the public page: the quoted handle and the name, the reading split the same way, the quotes of the reading dropped", () => {
  const model = modelOf(2);
  assert.deepEqual(
    { handle: model.casts[0].handle, name: model.casts[0].name, handleReading: model.casts[0].handleReading, nameReading: model.casts[0].nameReading },
    { handle: "“EX-Rookie”", name: "ルカ 日向", handleReading: "ニューゲーム", nameReading: "ヒュウガ ルカ" }
  );
  assert.equal(model.casts[1].handle, "“１０倍速”");
  assert.equal(model.casts[1].handleReading, "１０ぷんかかる");
  assert.equal(model.actName, "NEON AFTERIMAGE");
  assert.equal(model.subtitle, "ネオンの残像");
  assert.equal(model.rulerName, "稲荷秋");
  assert.equal(model.writerName, "芳賀琉");
});

test("the reading is split by the rule of splitCastName: spaces in the name's reading, no quotes = the reading of the name, a handle without a reading", () => {
  assert.deepEqual(splitReading("“ニューゲーム” ヒュウガ ルカ"), { handleReading: "ニューゲーム", nameReading: "ヒュウガ ルカ" });
  assert.deepEqual(splitReading("ヒュウガ ルカ"), { handleReading: "", nameReading: "ヒュウガ ルカ" });
  assert.deepEqual(splitReading("「ニューゲーム」ヒュウガ"), { handleReading: "ニューゲーム", nameReading: "ヒュウガ" });
  assert.deepEqual(splitReading(""), { handleReading: "", nameReading: "" });
  const model = buildPosterModel({ ...SHOWCASE, casts: [cast("CAST 01", "六号", "ロクゴウ", "カブト")] });
  assert.equal(model.casts[0].handle, "");
  assert.equal(model.casts[0].handleReading, "");
  assert.equal(model.casts[0].name, "六号");
  assert.equal(model.casts[0].nameReading, "ロクゴウ");
  // a reading that names a handle the cast does not have is not shown
  const noHandle = buildPosterModel({ ...SHOWCASE, casts: [cast("CAST 01", "六号", "“ろく” ロクゴウ", "カブト")] });
  assert.equal(noHandle.casts[0].handleReading, "");
});

test("the HO number, the handout's style (without ◎ ●) and only a safe image URL; at most six casts", () => {
  const model = buildPosterModel({ ...SHOWCASE, casts: [...CASTS, cast("CAST 07", "七号", "", "カブト")] });
  assert.equal(model.casts.length, 6);
  assert.deepEqual(model.casts.map(item => item.ho), ["HO1", "HO2", "HO3", "HO4", "HO5", "HO6"]);
  assert.deepEqual(model.casts.slice(0, 3).map(item => item.style), ["カブト", "トーキー", "ニューロ"]);
  const noSlot = buildPosterModel({ ...SHOWCASE, casts: [cast("", "A", "", "カブト"), cast("CAST 09", "B", "", "カゼ")] });
  assert.deepEqual(noSlot.casts.map(item => item.ho), ["HO1", "HO9"]);
  const unsafe = buildPosterModel({ ...SHOWCASE, casts: [cast("CAST 01", "A", "", "カブト", { imageUrl: "javascript:alert(1)" }), cast("CAST 02", "B", "", "カブト", { imageUrl: "" })] });
  assert.deepEqual(unsafe.casts.map(item => item.imageUrl), ["", ""]);
});

test("the style chips, the handout text, the guests and the hashtag are not in the model", () => {
  const model = buildPosterModel({ ...SHOWCASE, guests: [{ name: "ゲスト" }], guestRows: [{ name: "ゲスト" }], casts: CASTS.slice(0, 3) });
  const text = JSON.stringify(model);
  assert.doesNotMatch(text, /ここはハンドアウト本文|ゲスト|カゼ|#トーキョー/);
  assert.deepEqual(Object.keys(model.casts[0]).sort(), ["ho", "hoNumber", "handle", "handleReading", "imageUrl", "index", "name", "nameReading", "style"].sort());
  assert.deepEqual(Object.keys(model).sort(), ["actName", "casts", "catchCopy", "copyrightNotice", "dateText", "rightsNotice", "rulerName", "subtitle", "writerName"]);
});

test("the catch line: the last non-empty line of the trailer; nothing without a trailer; an explicit value wins; an empty value is no catch line", () => {
  assert.equal(defaultCatchCopy(SHOWCASE), "運命の扉は、いつだって突然開く。");
  assert.equal(defaultCatchCopy({ trailer: "一行\r\n二行目\r\n\r\n" }), "二行目");
  assert.equal(defaultCatchCopy({ trailerText: "旧データの予告" }), "旧データの予告");
  assert.equal(defaultCatchCopy({}), "");
  assert.equal(defaultCatchCopy({ trailer: { body: "  \n \n" } }), "");
  assert.equal(modelOf(1).catchCopy, "運命の扉は、いつだって突然開く。");
  assert.equal(buildPosterModel({ ...SHOWCASE, trailer: undefined, casts: CASTS.slice(0, 1) }).catchCopy, "");
  assert.equal(buildPosterModel(SHOWCASE, { catchCopy: "自分の一言" }).catchCopy, "自分の一言");
  assert.equal(buildPosterModel(SHOWCASE, { catchCopy: "" }).catchCopy, "", "cleared by hand: no catch line");
  assert.equal(Array.from(buildPosterModel(SHOWCASE, { catchCopy: "あ".repeat(60) }).catchCopy).length, 40);
  const layout = layoutPoster(buildPosterModel(SHOWCASE, { catchCopy: "" }), measureWith(0.5), { theme: THEME });
  assert.equal(layout.catchLine, null);
});

test("an empty date reads 近日開演; the date is limited to 24 characters; the rights notice is the one constant", () => {
  assert.equal(buildPosterModel(SHOWCASE).dateText, POSTER_DEFAULT_DATE);
  assert.equal(POSTER_DEFAULT_DATE, "近日開演");
  assert.equal(buildPosterModel(SHOWCASE, { date: "   " }).dateText, "近日開演");
  assert.equal(Array.from(buildPosterModel(SHOWCASE, { date: "9".repeat(40) }).dateText).length, 24);
  assert.equal(buildPosterModel(SHOWCASE).rightsNotice, POSTER_RIGHTS_NOTICE);
  assert.equal(POSTER_RIGHTS_NOTICE, "本画像は非公式ファンツール「CAST ARCHIVE」で生成したものです。各権利者による公式の画像・サービスではありません。");
  assert.equal(POSTER_COPYRIGHT_NOTICE, "(C)FarEast Amusement Research Co.,Ltd.／(C)GameField Co.,Ltd.");
  assert.equal(layoutPoster(buildPosterModel(SHOWCASE), measureWith(0.5), { theme: THEME }).date.main.text, "近日開演");
  assert.deepEqual(splitDate("11.23 SUN 21:00〜"), { main: "11.23", sub: "SUN 21:00〜" });
  assert.deepEqual(splitDate("12.01"), { main: "12.01", sub: "" });
});

test("the default subtitle CAST SHOWCASE is not shown, like on the public page", () => {
  assert.equal(buildPosterModel({ ...SHOWCASE, heroSubTitle: "CAST SHOWCASE" }).subtitle, "");
  assert.equal(layoutPoster(buildPosterModel({ ...SHOWCASE, heroSubTitle: "" }), measureWith(0.5), { theme: THEME }).subtitle, null);
});

test("one to four casts are slanted portraits side by side (width, step and height by count), the odd ones lower and the even ones higher", () => {
  const spec = { 3: { width: 372, step: 346, ys: [44, 8, 44] }, 4: { width: 300, step: 278, ys: [44, 8, 44, 8] } };
  for (const count of [3, 4]) {
    const layout = layoutPoster(modelOf(count), measureWith(0.5), { theme: THEME });
    assert.equal(layout.mode, "portraits");
    assert.deepEqual(layout.panels.map(panel => panel.y), spec[count].ys);
    assert.deepEqual(layout.panels.map(panel => panel.width), Array(count).fill(spec[count].width));
    assert.deepEqual(layout.panels.map(panel => panel.x), layout.panels.map((_, index) => 40 + spec[count].step * index));
    assert.deepEqual(layout.panels.map(panel => panel.height), Array(count).fill(392));
    assert.equal(layout.width, 1200);
    assert.equal(layout.height, 675);
    // leaning 7 degrees: the top edge is shifted right by height * tan(7deg)
    assert.ok(Math.abs(layout.panels[0].skew - 392 * Math.tan((7 * Math.PI) / 180)) < 1e-9);
  }
  for (const count of [1, 2]) {
    const layout = layoutPoster(modelOf(count), measureWith(0.5), { theme: THEME });
    assert.equal(layout.mode, "portraits");
    assert.ok(layout.panels.every(panel => panel.width > 372 && panel.width <= 400), "wider than three casts, at most about 400");
    assert.deepEqual(layout.panels.map(panel => panel.y), [44, 8].slice(0, count));
    assert.equal(layout.panels[0].x, 40);
  }
});

test("five and six casts are a roster of cards, three columns by two rows, each with a 108px portrait", () => {
  for (const count of [5, 6]) {
    const layout = layoutPoster(modelOf(count), measureWith(0.5), { theme: THEME });
    assert.equal(layout.mode, "roster");
    assert.equal(layout.panels.length, count);
    assert.ok(layout.panels.every(panel => panel.width === 360 && panel.height === 205 && panel.portrait.width === 108));
    assert.deepEqual(layout.panels.map(panel => panel.x), [40, 420, 800, 40, 420, 800].slice(0, count));
    assert.deepEqual(layout.panels.map(panel => panel.y), [14, 14, 14, 233, 233, 233].slice(0, count));
    assert.equal(layout.nameMode, "one-line", "a roster card holds the handle and the name on one line");
    assert.equal(new Set(layout.panels.map(panel => panel.card.line.fontSize)).size, 1, "one size for every card");
    for (const panel of layout.panels) assert.ok(panel.card.line.baseline > panel.card.ho.baseline);
  }
});

test("name plates: one line for all at the common size when it is 26px or more, else two lines for all at 28px; never mixed; the plate heights are equal", () => {
  const seen = new Set();
  for (let k = 0.3; k <= 2.4; k += 0.05) {
    for (const count of [3, 4]) {
      const layout = layoutPoster(modelOf(count), measureWith(k), { theme: THEME });
      const modes = new Set(layout.panels.map(panel => panel.plate.mode));
      assert.equal(modes.size, 1, `no mix at k=${k.toFixed(2)}`);
      assert.equal(new Set(layout.panels.map(panel => panel.plate.height)).size, 1, "equal heights");
      const [mode] = modes;
      seen.add(mode);
      if (mode === "one-line") {
        assert.ok(layout.nameFontSize >= ONE_LINE_MIN_FONT && layout.nameFontSize <= 36, `one line only from 26px: ${layout.nameFontSize}`);
        assert.ok(layout.panels.every(panel => panel.plate.rows.line.fontSize === layout.nameFontSize), "one common size");
        assert.ok(layout.panels.every(panel => panel.plate.top === panel.y + PLATE_TOP_ONE_LINE));
      } else {
        assert.equal(layout.nameFontSize, TWO_LINE_FONT);
        assert.ok(layout.panels.every(panel => panel.plate.top === panel.y + PLATE_TOP_TWO_LINE));
        assert.ok(layout.panels.every(panel => panel.plate.rows.name && panel.plate.rows.name.baseline > (panel.plate.rows.handle?.baseline ?? 0)), "the name under the handle");
      }
    }
  }
  assert.deepEqual([...seen].sort(), ["one-line", "two-lines"], "both modes are reached");
  assert.equal(PLATE_TOP_ONE_LINE - PLATE_TOP_TWO_LINE, 60, "the two-line plate is 60px higher");
});

test("the common size is the smallest of everyone's: one long name takes everybody down", () => {
  const short = layoutPoster(modelOf(3), measureWith(0.5), { theme: THEME });
  const longCasts = [CASTS[0], { ...CASTS[1], fullName: "“とても長いハンドルです” とても長い氏名の持ち主" }, CASTS[2]];
  const long = layoutPoster(buildPosterModel({ ...SHOWCASE, casts: longCasts }), measureWith(0.5), { theme: THEME });
  assert.ok(long.nameMode === "two-lines" || long.nameFontSize < short.nameFontSize || short.nameMode === "two-lines");
  if (long.nameMode === "one-line") assert.ok(long.panels.every(panel => panel.plate.rows.line.fontSize === long.nameFontSize));
});

test("a cast without a handle has its name alone (one line: no quotes; two lines: the name in the first row)", () => {
  const model = buildPosterModel({ ...SHOWCASE, casts: [cast("CAST 01", "鋼鉄の番犬ロクゴウ", "ロクゴウ", "カブト"), cast("CAST 02", "境界線の観測者ナナゴウ", "", "カゼ")] });
  const layout = layoutPoster(model, measureWith(2.2), { theme: THEME });
  assert.equal(layout.nameMode, "two-lines");
  for (const panel of layout.panels) {
    assert.equal(panel.plate.rows.handle, null);
    assert.ok(panel.plate.rows.name.baseline > 0);
  }
  const wide = layoutPoster(model, measureWith(0.4), { theme: THEME });
  assert.equal(wide.nameMode, "one-line");
  assert.equal(wide.panels[0].plate.rows.line.handle, null);
});

test("the title is 56 to 68px and shrinks until it clears the date; the date is at the bottom right", () => {
  const short = layoutPoster(buildPosterModel({ ...SHOWCASE, actName: "SHORT" }, { date: "11.23 SUN 21:00〜" }), measureWith(0.6), { theme: THEME });
  assert.equal(short.title.fontSize, 68);
  assert.ok(short.date.right === 1160 && short.date.main.baseline > 500);
  const sizes = [];
  for (const actName of ["NEON AFTERIMAGE", "NEON AFTERIMAGE NEON AFTERIMAGE", "とても長いアクト名とても長いアクト名とても長いアクト名とても長いアクト名"]) {
    const layout = layoutPoster(buildPosterModel({ ...SHOWCASE, actName }, { date: "11.23 SUN 21:00〜" }), measureWith(0.6), { theme: THEME });
    const width = measureWith(0.6)(actName, layout.title.fontSize, 900, ROLE_TITLE);
    sizes.push(layout.title.fontSize);
    if (layout.title.fontSize > 24) assert.ok(layout.title.x + width <= layout.date.left - 28 + 1e-9, "the title clears the date");
    assert.ok(layout.title.fontSize <= 68);
  }
  assert.ok(sizes[0] >= sizes[1] && sizes[1] >= sizes[2], "a longer name is never bigger");
  assert.ok(sizes[2] < 56, "very long: shrunk below 56 so it still does not touch the date");
  // a wide date takes room from the title
  const noDate = layoutPoster(buildPosterModel({ ...SHOWCASE, actName: "NEON AFTERIMAGE" }), measureWith(0.6), { theme: THEME });
  assert.ok(noDate.date.main.fontSize >= 24);
});

test("the credits: RL and writer, left out when empty", () => {
  const both = layoutPoster(modelOf(3), measureWith(0.5), { theme: THEME });
  assert.deepEqual(both.credits.items.map(item => [item.label, item.value]), [["RL", "稲荷秋"], ["WRITER", "芳賀琉"]]);
  assert.ok(both.credits.fontSize >= 20 && both.credits.fontSize <= 24);
  assert.ok(both.credits.items[1].chip.x > both.credits.items[0].valueX);
  const none = layoutPoster(buildPosterModel({ ...SHOWCASE, rulerName: "", scenarioWriterName: "" }), measureWith(0.5), { theme: THEME });
  assert.deepEqual(none.credits.items, []);
  assert.equal(both.rights.text, POSTER_RIGHTS_NOTICE);
  assert.equal(both.rights.copyright.text, POSTER_COPYRIGHT_NOTICE);
  assert.equal(both.rights.copyright.right, 1160, "the copyright line is right-aligned to the margin");
  assert.equal(both.rights.copyright.baseline, both.rights.baseline, "one bottom row");
});

test("the bottom row: the notice stays at 11px when both fit, and shrinks (never below 9px) only when they do not", () => {
  const model = modelOf(3);
  const wide = layoutPoster(model, measureWith(0.5), { theme: THEME });
  assert.equal(wide.rights.fontSize, 11);
  const narrow = layoutPoster(model, measureWith(0.95), { theme: THEME });
  assert.ok(narrow.rights.fontSize < 11 && narrow.rights.fontSize >= 9);
  const tooWide = layoutPoster(model, measureWith(3), { theme: THEME });
  assert.equal(tooWide.rights.fontSize, 9);
});

test("the HO colours are primary, secondary, accent in the order of the casts, repeating; the fourth on is a derived variant", () => {
  const layout = layoutPoster(modelOf(6), measureWith(0.5), { theme: THEME });
  assert.deepEqual(layout.panels.map(panel => panel.color.key), ["primary", "secondary", "accent", "primary", "secondary", "accent"]);
  assert.deepEqual(layout.panels.slice(0, 3).map(panel => panel.color.value), [THEME.primary, THEME.secondary, THEME.accent]);
  for (const index of [3, 4, 5]) {
    const { base, value, step } = layout.panels[index].color;
    assert.equal(base, [THEME.primary, THEME.secondary, THEME.accent][index - 3]);
    assert.equal(step, 1);
    assert.notEqual(value, base, "a variant, not the same colour again");
    assert.match(value, /^#[0-9a-f]{6}$/);
  }
  assert.equal(deriveAuxiliaryColor("#000000", 1), "#4d4d4d");
  assert.equal(deriveAuxiliaryColor("rgb(255, 255, 255)", 2), "#adadad");
  assert.equal(deriveAuxiliaryColor("#abc", 0), "#abc");
  assert.equal(deriveAuxiliaryColor("not a colour", 1), "not a colour", "an unreadable colour is returned as it is");
  assert.equal(hoColor({ primary: "var(--x)" }, 3).value, "var(--x)");
});

test("no colour is written in the layout file, and nothing in the poster code says official", async () => {
  const layoutSource = await readFile(new URL("../js/act-poster-layout.js", import.meta.url), "utf8");
  assert.equal(countHardcodedColors(layoutSource, "js"), 0, "audit:colors counts nothing in the layout");
  assert.doesNotMatch(layoutSource.replace(/\/\*[\s\S]*?\*\/|(^|[\s;,{}()])\/\/[^\n]*/g, "$1"), /#[0-9a-f]{3,8}\b/i);
  assert.match(layoutSource, /要確認/, "the rights wording is marked to be confirmed");
  for (const file of ["act-poster-layout.js", "act-poster-render.js"]) {
    const code = (await readFile(new URL(`../js/${file}`, import.meta.url), "utf8")).replace(/\/\*[\s\S]*?\*\/|(^|[\s;,{}()])\/\/[^\n]*/g, "$1").replace(/非公式/g, "").replace(/各権利者による公式の画像・サービスではありません。/g, "");
    assert.doesNotMatch(code, /公式|公認|official/i, `${file} claims nothing official`);
  }
});

test("a cast whose published image is the placeholder's path has no image (the renderer draws its own, lifted placeholder)", () => {
  assert.equal(posterImageUrl("./assets/placeholders/scan-failed.webp"), "");
  assert.equal(posterImageUrl("https://example.test/assets/placeholders/scan-failed.webp?v=2"), "");
  assert.equal(posterImageUrl("https://example.test/storage/cast.png"), "https://example.test/storage/cast.png");
  assert.equal(posterImageUrl(""), "");
  assert.equal(posterImageUrl("javascript:alert(1)"), "");
  const model = buildPosterModel({ ...SHOWCASE, casts: [cast("CAST 01", "甲", "", "カブト", { imageUrl: "./assets/placeholders/scan-failed.webp" })] });
  assert.equal(model.casts[0].imageUrl, "");
});

test("an HO colour too dark for the dark ground (the black of a light theme) is lifted until it can be seen; a bright one is left alone", () => {
  const luminance = color => {
    const [r, g, b] = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  assert.ok(luminance(readableOnDark("#111111")) >= 0.2, "lifted");
  assert.notEqual(readableOnDark("#111111"), "#111111");
  assert.equal(readableOnDark("#70eaff"), "#70eaff");
  assert.equal(readableOnDark("#ffffff"), "#ffffff");
  assert.equal(readableOnDark("var(--unknown)"), "var(--unknown)", "an unreadable colour is left as it is");
  const dark = hoColor({ primary: "#111111", secondary: "#9b3268", accent: "#236b49" }, 0);
  assert.equal(dark.base, "#111111");
  assert.ok(luminance(dark.value) >= 0.2);
  const layout = layoutPoster(modelOf(3), measureWith(0.5), { theme: { primary: "#111111", secondary: "#9b3268", accent: "#236b49" } });
  assert.ok(layout.panels.every(panel => luminance(panel.color.value) >= 0.2 || !/^#/.test(panel.color.value)));
});
