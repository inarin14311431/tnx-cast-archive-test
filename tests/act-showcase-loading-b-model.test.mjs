import test from "node:test";
import assert from "node:assert/strict";
import { MAX_PCS, bootLines } from "../js/act-showcase-loading-b.js";
import { bootTypingPlan } from "../js/act-showcase-neotokyo.js";

// docs/ACT_SHOWCASE_SCENES.md §6 #7 (6th pattern: loading): the boot log of the "boot terminal" is built from the act's own data, line by line.
// Nothing here touches the DOM.
const cast = fullName => ({ fullName });
const full = {
  slug: "act-0021",
  actName: "夜明けを駆ける者",
  themeCode: "NEON GRID",
  rulerName: "VISUAL RULER",
  scenarioWriterName: "脚本 太郎",
  casts: [cast("“ブルー・モーメント” 夜明けのランナー"), cast("“ガーディアン” 鋼鉄の番犬"), cast("“ホワイトノイズ” 境界線の観測者")],
  guestRows: [{ name: "協力者 K" }]
};

test("the log is the handshake, the act's data, one line per PC with a handle, the guests and decrypt, in that order", () => {
  assert.deepEqual(bootLines(full), [
    "handshake ... ok",
    "act file act-0021 located",
    "act: 夜明けを駆ける者",
    "theme: NEON GRID",
    "ruler: VISUAL RULER",
    "scenario writer: 脚本 太郎",
    "PC1 “ブルー・モーメント” linked",
    "PC2 “ガーディアン” linked",
    "PC3 “ホワイトノイズ” linked",
    "guest files: 1",
    "decrypt ... done"
  ]);
});

test("a line without data is left out, whole: no placeholder text takes its place", () => {
  const lines = bootLines({ slug: "", actName: " ", themeCode: "", rulerName: "", scenarioWriterName: "  ", casts: [], guestRows: [] });
  assert.deepEqual(lines, ["handshake ... ok", "decrypt ... done"]);
  for (const text of bootLines({ casts: [cast("名前だけ")] })) assert.doesNotMatch(text, /UNREGISTERED|NO HANDLE|undefined|null|NaN/);
  assert.deepEqual(bootLines(undefined), ["handshake ... ok", "decrypt ... done"]);
});

test("a PC without a handle has no line and the others keep their own numbers; the handle gets one pair of quotes whatever it came with", () => {
  const lines = bootLines({ casts: [cast("“ひとり”  名前"), cast("ハンドル無し 名前"), cast("「かぎ括弧」 名前"), cast("\"二重\" 名前")] });
  assert.deepEqual(lines.filter(text => text.startsWith("PC")), ["PC1 “ひとり” linked", "PC3 “かぎ括弧” linked", "PC4 “二重” linked"]);
});

test("at most six PCs are named, and the guest line counts the guests that have a name; none, no line", () => {
  const many = Array.from({ length: 9 }, (_, index) => cast(`“P${index + 1}” 名`));
  assert.equal(MAX_PCS, 6);
  assert.equal(bootLines({ casts: many }).filter(text => text.startsWith("PC")).length, 6);
  assert.ok(bootLines({ guestRows: [{ name: "A" }, { name: " " }, { name: "B" }, {}] }).includes("guest files: 2"));
  assert.ok(!bootLines({ guestRows: [{ name: "" }] }).some(text => text.startsWith("guest files")));
  assert.ok(!bootLines({ guestRows: "not a list" }).some(text => text.startsWith("guest files")));
});

test("the typing takes about the same time for one PC or six: the step grows with the log, never below 6 ms and never above 24 ms", () => {
  const time = total => {
    const { chunk, interval } = bootTypingPlan(total);
    return Math.ceil(total / chunk) * interval;
  };
  assert.deepEqual(bootTypingPlan(0), { chunk: 1, interval: 6 });
  // a short log is typed one character at a time, at the slowest step (24 ms) that still fits the time: it takes less than the budget
  assert.deepEqual(bootTypingPlan(40), { chunk: 1, interval: 24 });
  assert.equal(time(40), 960);
  // a long log (six PCs, about 500 characters) takes several characters per step so that it still ends in about the budget
  for (const total of [120, 250, 366, 500, 700]) {
    const { chunk, interval } = bootTypingPlan(total);
    assert.ok(interval >= 6 && interval <= 24, `interval ${interval}`);
    assert.ok(time(total) <= 2200, `${total} characters take ${time(total)} ms`);
    assert.ok(chunk >= 1, `chunk ${chunk}`);
  }
  assert.ok(bootTypingPlan(500).chunk >= 2);
  assert.ok(bootTypingPlan(366).chunk === 1);
});
