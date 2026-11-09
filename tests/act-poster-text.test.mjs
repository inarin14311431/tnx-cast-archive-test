import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { countHardcodedColors } from "../scripts/hardcoded-colors-lib.mjs";
import { buildPosterModel } from "../js/act-poster-layout.js";
import {
  buildPosterAltText, buildPosterPostText, buildPosterPostUrl, posterCastLine, posterFileName, clampPosterInput,
  loadPosterInputs, savePosterInputs, POSTER_INPUT_LIMITS, POSTER_ALT_MAX_LENGTH, POSTER_STORAGE_PREFIX
} from "../js/act-poster-text.js";
import { buildSharePostText, buildXIntentUrl, SHOWCASE_HASHTAG } from "../js/showcase-publish-result-core.js";

// The words around the poster (js/act-poster-text.js): alt text, post text, the limits of the inputs and what is remembered for the tab.
const cast = (slot, fullName, reading, role) => ({ slot, fullName, reading, imageUrl: "", styles: [{ label: `${role}◎`, handoutRole: true }], handout: { body: "ハンドアウト本文" } });
const SHOWCASE = {
  actName: "NEON AFTERIMAGE", heroSubTitle: "ネオンの残像", rulerName: "稲荷秋", scenarioWriterName: "芳賀琉",
  trailer: { body: "一行目\n運命の扉は、いつだって突然開く。" },
  casts: [cast("CAST 01", "“EX-Rookie” ルカ 日向", "“ニューゲーム” ヒュウガ ルカ", "カブト"), cast("CAST 02", "“１０倍速” ツルツル", "ツルツル", "トーキー")]
};
const model = buildPosterModel(SHOWCASE, { date: "11.23 SUN 21:00〜" });

test("one cast on a line: HO, style, quoted handle, name", () => {
  assert.equal(posterCastLine(model.casts[0]), "HO1 カブト “EX-Rookie” ルカ 日向");
  assert.equal(posterCastLine({ ho: "HO2", style: "", handle: "", name: "六号" }), "HO2 六号");
});

test("the alt text: the act, who runs it, every HO with its readings, the catch line and the date; no handout text", () => {
  const alt = buildPosterAltText(model);
  const lines = alt.split("\n");
  assert.equal(lines[0], "アクト紹介の予告ポスター。アクト名「NEON AFTERIMAGE」、ネオンの残像。");
  assert.ok(lines.includes("RL: 稲荷秋"));
  assert.ok(lines.includes("ライター: 芳賀琉"));
  assert.ok(lines.includes("HO1 カブト “EX-Rookie” ルカ 日向 (ハンドルの読み: ニューゲーム) (氏名の読み: ヒュウガ ルカ)"));
  assert.ok(lines.includes("HO2 トーキー “１０倍速” ツルツル (氏名の読み: ツルツル)"), "a reading that is missing is left out");
  assert.ok(lines.includes("キャッチコピー: 運命の扉は、いつだって突然開く。"));
  assert.equal(lines.at(-1), "日付: 11.23 SUN 21:00〜");
  assert.doesNotMatch(alt, /ハンドアウト本文/);
  const bare = buildPosterAltText(buildPosterModel({ ...SHOWCASE, rulerName: "", scenarioWriterName: "", heroSubTitle: "", trailer: null }, { catchCopy: "" }));
  assert.doesNotMatch(bare, /RL:|ライター:|キャッチコピー:/);
  assert.match(bare, /日付: 近日開演/);
});

test("the alt text stays within the 1000 characters X accepts", () => {
  const many = buildPosterModel({ ...SHOWCASE, casts: Array.from({ length: 6 }, (_, index) => cast(`CAST ${index + 1}`, `“${"長い".repeat(20)}” ${"名".repeat(30)}`, `“${"よみ".repeat(20)}” ${"ヨミ".repeat(30)}`, "カブト")) });
  const alt = buildPosterAltText(many);
  assert.equal(Array.from(alt).length, POSTER_ALT_MAX_LENGTH);
  assert.ok(alt.endsWith("…"));
  assert.equal(POSTER_ALT_MAX_LENGTH, 1000);
  assert.ok(Array.from(buildPosterAltText(model)).length < POSTER_ALT_MAX_LENGTH);
});

test("the post text: the act and its subtitle, who runs it, the HO list, the hashtag (and the public URL in the intent link)", () => {
  assert.equal(buildPosterPostText(model), [
    "『NEON AFTERIMAGE ― ネオンの残像』のアクト紹介を公開しました",
    "RL: 稲荷秋 / ライター: 芳賀琉",
    "HO1 カブト “EX-Rookie” ルカ 日向",
    "HO2 トーキー “１０倍速” ツルツル",
    SHOWCASE_HASHTAG
  ].join("\n"));
  const link = new URL(buildPosterPostUrl(model, "https://example.test/act-showcase.html?id=a&theme=nova"));
  assert.equal(`${link.origin}${link.pathname}`, "https://x.com/intent/post");
  assert.equal(link.searchParams.get("text"), buildPosterPostText(model));
  assert.equal(link.searchParams.get("url"), "https://example.test/act-showcase.html?id=a&theme=nova");
  // only what exists is said: no empty lines
  const bare = buildPosterPostText(buildPosterModel({ ...SHOWCASE, rulerName: "", scenarioWriterName: "", heroSubTitle: "", casts: [] }));
  assert.equal(bare, `『NEON AFTERIMAGE』のアクト紹介を公開しました\n${SHOWCASE_HASHTAG}`);
  assert.doesNotMatch(buildPosterPostText(model), /ハンドアウト本文/);
});

test("the older, shorter post text is unchanged when nothing more is given", () => {
  assert.equal(buildSharePostText({ actName: "A", subtitle: "B" }), `『A ― B』のアクト紹介を公開しました\n${SHOWCASE_HASHTAG}`);
  assert.equal(buildSharePostText({ actName: "A", rulerName: "RL名" }), `『A』のアクト紹介を公開しました\nRL: RL名\n${SHOWCASE_HASHTAG}`);
  const link = new URL(buildXIntentUrl({ actName: "A", url: "https://example.test/x" }));
  assert.equal(link.searchParams.get("text"), `『A』のアクト紹介を公開しました\n${SHOWCASE_HASHTAG}`);
  assert.equal(link.searchParams.get("url"), "https://example.test/x");
});

test("the inputs are limited to 24 (date) and 40 (catch line) characters, counted in characters not code units", () => {
  assert.deepEqual({ ...POSTER_INPUT_LIMITS }, { date: 24, catchCopy: 40 });
  assert.equal(clampPosterInput("あ".repeat(50), 40), "あ".repeat(40));
  assert.equal(clampPosterInput("𠮷".repeat(30), 24), "𠮷".repeat(24));
  assert.equal(clampPosterInput(null, 24), "");
  assert.equal(Array.from(buildPosterModel(SHOWCASE, { date: "9".repeat(30) }).dateText).length, 24);
  assert.equal(Array.from(buildPosterModel(SHOWCASE, { catchCopy: "あ".repeat(60) }).catchCopy).length, 40);
});

test("the file name carries the act's identifier; JPEG gets .jpg", () => {
  assert.equal(posterFileName("neon-afterimage"), "act-poster-neon-afterimage.png");
  assert.equal(posterFileName("neon-afterimage", "image/jpeg"), "act-poster-neon-afterimage.jpg");
  assert.equal(posterFileName("../a b/c"), "act-poster-a-b-c.png");
  assert.equal(posterFileName(""), "act-poster-act.png");
});

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: key => (data.has(key) ? data.get(key) : null), setItem: (key, value) => { data.set(key, String(value)); }, data };
}

test("the inputs are remembered per act in the storage and come back clamped; nothing stored is null", () => {
  const storage = memoryStorage();
  assert.equal(loadPosterInputs(storage, "act-1"), null);
  assert.equal(savePosterInputs(storage, "act-1", { date: "11.23 SUN 21:00〜", catchCopy: "一言" }), true);
  assert.equal(savePosterInputs(storage, "Act-2", { date: "12.01", catchCopy: "" }), true);
  assert.deepEqual(loadPosterInputs(storage, "act-1"), { date: "11.23 SUN 21:00〜", catchCopy: "一言" });
  assert.deepEqual(loadPosterInputs(storage, "act-2"), { date: "12.01", catchCopy: "" }, "an emptied catch line stays empty (not the first value again)");
  assert.ok([...storage.data.keys()].every(key => key.startsWith(POSTER_STORAGE_PREFIX)));
  assert.equal(loadPosterInputs(storage, "act-3"), null);
  // what is stored is clamped on the way in and on the way out
  savePosterInputs(storage, "act-1", { date: "9".repeat(60), catchCopy: "あ".repeat(60) });
  assert.equal(Array.from(loadPosterInputs(storage, "act-1").date).length, 24);
  storage.data.set(`${POSTER_STORAGE_PREFIX}act-4`, JSON.stringify({ date: "x".repeat(99), catchCopy: 5 }));
  assert.deepEqual(loadPosterInputs(storage, "act-4"), { date: "x".repeat(24), catchCopy: "" });
});

test("a storage that cannot be used does not make anything fail", () => {
  const throwing = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("quota"); } };
  assert.equal(loadPosterInputs(throwing, "act-1"), null);
  assert.equal(savePosterInputs(throwing, "act-1", { date: "x" }), false);
  assert.equal(loadPosterInputs(null, "act-1"), null);
  assert.equal(loadPosterInputs(undefined, "act-1"), null);
  assert.equal(savePosterInputs(null, "act-1", { date: "x" }), false, "no storage: nothing is written and nothing is thrown");
  const broken = memoryStorage({ [`${POSTER_STORAGE_PREFIX}act-1`]: "{not json" });
  assert.equal(loadPosterInputs(broken, "act-1"), null);
  assert.equal(loadPosterInputs(memoryStorage({ [`${POSTER_STORAGE_PREFIX}act-1`]: "42" }), "act-1"), null);
});

test("no colour is written in the words module", async () => {
  const source = await readFile(new URL("../js/act-poster-text.js", import.meta.url), "utf8");
  assert.equal(countHardcodedColors(source, "js"), 0);
});
