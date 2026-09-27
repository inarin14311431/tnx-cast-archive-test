import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildDivineSlots, buildStyleSlots, resolveDivineYomi, stripOuterQuotes } from "../js/cast-hero-view.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const castHtml = await read("cast.html");
const castJs = await read("js/cast.js");
const castCss = await read("css-next/pages/cast.css");
const runtimeCss = await read("css-next/pages/cast-cyber-runtime.css");
const effectsCss = await read("css-next/pages/cast-cyber-effects.css");
const detailsCss = await read("css-next/pages/cast-view-details.css");
const archetypeView = await read("js/cast-archetype-view.js");
const cyberTrigger = await read("js/cast-cyber-trigger.js");

const hero = castHtml.slice(castHtml.indexOf('<div class="cast-hero__identity">'), castHtml.indexOf('<nav class="cast-tabs"'));

test("hero identity order: name, summary, styles, divine works, facts, sheet link", () => {
  const order = ['class="cast-name-section"', 'id="cast-summary-panel"', 'class="cast-hero-styles"', 'class="cast-hero-divines"', 'class="identity-grid"', 'id="cast-character-sheet-slot"'];
  const positions = order.map(marker => hero.indexOf(marker));
  assert.ok(positions.every(position => position >= 0), positions.join(","));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test("name keeps h1#cast-name and drops the NAME heading and separate readings row", () => {
  assert.match(hero, /<div class="cast-name-primary"><span id="cast-handle" class="cast-handle"><\/span><h1 id="cast-name" class="cast-name"><\/h1><\/div>/);
  assert.doesNotMatch(hero, /cast-name-heading|cast-name-readings|cast-handle-kana|id="cast-kana"/);
  assert.doesNotMatch(castCss, /\.cast-name-readings|\.cast-handle-kana|\.cast-name-heading/);
});

test("names render as ruby with quotes outside the handle ruby and no empty rt", () => {
  assert.match(castJs, /`“\$\{renderRuby\(handle, stripOuterQuotes\(character\.handle_kana\)\)\}”`/);
  assert.match(castJs, /renderRuby\(displayValue\(character\.character_name\), character\.character_kana\)/);
  assert.match(castJs, /return text\s*\?\s*`<ruby>\$\{escapeHtml\(base\)\}<rt>\$\{escapeHtml\(text\)\}<\/rt><\/ruby>`\s*:\s*escapeHtml\(base\);/);
  assert.equal(stripOuterQuotes("“べたべたお化け”"), "べたべたお化け");
  assert.equal(stripOuterQuotes("「“歌わない小夜啼鳥”」"), "歌わない小夜啼鳥");
});

test("name line wraps only between handle and name and keeps the divider on the same line", () => {
  assert.match(castCss, /\.cast-name-section \{[^}]*overflow: hidden;/);
  assert.match(castCss, /\.cast-name-primary \{[^}]*flex-wrap: wrap;[^}]*margin-left: calc\(var\(--cast-name-gap\) \* -1\);/);
  assert.match(castCss, /\.cast-name-primary > \* \{[^}]*word-break: keep-all;/);
  assert.match(castCss, /\.cast-name-primary > \*::before \{[^}]*left: calc\(var\(--cast-name-gap\) \/ 2\);/);
});

test("summary sits under the name without the SCAN SUMMARY heading and clamps at three lines", () => {
  assert.doesNotMatch(castHtml, /SCAN SUMMARY|cast-summary-heading/);
  assert.match(hero, /<section id="cast-summary-panel" class="cast-hero-summary" aria-label="一言" hidden><p id="cast-summary" class="cast-summary"><\/p><button id="cast-summary-toggle"/);
  assert.match(castCss, /\.cast-summary \{ max-height: calc\(1\.7em \* 3\);[^}]*white-space: pre-wrap; font-size: clamp\(1\.1rem, 1\.6vw, 1\.44rem\); line-height: 1\.7;/);
  assert.match(castJs, /const summary = String\(character\.summary \?\? ""\)\.trim\(\);\s*document\.querySelector\("#cast-summary"\)\.textContent = summary;\s*document\.querySelector\("#cast-summary-panel"\)\.hidden = !summary;/);
});

test("style roles keep the PERSONA / KEY / PERSONA=KEY / SHADOW rules", () => {
  const slots = buildStyleSlots({ style_1: "カブキ", style_1_mark: "◎", style_2: "マヤカシ", style_2_mark: "●", style_3: "カタナ", style_3_mark: "" });
  assert.deepEqual(slots.map(({ number, role, state, featured }) => [number, role, state, featured]), [
    ["01", "PERSONA", "is-persona", true],
    ["02", "KEY", "is-key", true],
    ["03", "SHADOW", "is-standard", false]
  ]);
  const same = buildStyleSlots({ style_1: "ヒルコ", style_1_mark: "◎●", style_2: "ヒルコ", style_2_mark: "", style_3: "ヒルコ", style_3_mark: "" });
  assert.deepEqual(same.map(({ role, state }) => [role, state]), [["PERSONA=KEY", "is-dual"], ["", "is-standard"], ["", "is-standard"]]);
});

test("divine work n takes the role state of style n and keeps its slot number", () => {
  const slots = buildDivineSlots({ style_1: "カブキ", style_1_mark: "◎", style_2: "マヤカシ", style_2_mark: "●", style_3: "カタナ", style_3_mark: "", divine_1: "チャイ", divine_2: "守護神", divine_3: "死の舞踏" });
  assert.deepEqual(slots.map(({ code, state }) => [code, state]), [["MIRACLE-01", "is-persona"], ["MIRACLE-02", "is-key"], ["MIRACLE-03", "is-standard"]]);
  const gap = buildDivineSlots({ style_1: "カブキ", style_3: "カタナ", divine_1: "チャイ", divine_3: "死の舞踏" });
  assert.deepEqual(gap.map(({ code }) => code), ["MIRACLE-01", "MIRACLE-03"]);
});

test("divine readings: official spelling, then the stored reading; readings equal to the name are hidden", () => {
  assert.equal(resolveDivineYomi("突然変異", ""), "ミューテーション");
  assert.equal(resolveDivineYomi("突然変異", "ミューテイション"), "ミューテーション");
  assert.equal(resolveDivineYomi("死の舞踏", "死の舞踏"), "ダンスマカブル");
  assert.equal(resolveDivineYomi("脱出", "エクソダス"), "エクソダス");
  assert.equal(resolveDivineYomi("チャイ", "チャイ"), "");
  assert.equal(resolveDivineYomi("ファイト！", ""), "");
  assert.equal(resolveDivineYomi("守護神", "まもりがみ"), "まもりがみ");
  assert.equal(resolveDivineYomi("独自神業", ""), "");
});

test("style and divine colors come only from role tokens; fixed divine colors are gone", () => {
  for (const role of ["persona", "key", "dual"]) {
    assert.match(castCss, new RegExp(`\\.cast-style-slot\\.is-${role} \\{ --style-local: var\\(--color-style-${role}\\); \\}`));
    assert.match(castCss, new RegExp(`\\.cast-divine-slot\\.is-${role} \\{ --divine-local: var\\(--color-style-${role}\\); \\}`));
  }
  assert.match(castCss, /\.cast-divine-slot \{ --divine-local: var\(--color-accent\);/);
  assert.doesNotMatch(castCss + detailsCss, /cast-divine-card|#b074ff|#ffb657/i);
  const heroCss = castCss.slice(castCss.indexOf(".cast-hero__identity {"), castCss.indexOf("@container cast-identity (max-width: 440px)"));
  assert.doesNotMatch(heroCss, /#[0-9a-f]{3,8}\b|rgb\(/i);
});

test("featured style slots are wider with a cut corner; plain slots are a light band", () => {
  assert.match(castCss, /\.cast-style-slot\.is-featured \{ flex-grow: 1\.25;/);
  assert.match(castCss, /\.cast-divine-slot\.is-featured \{ flex-grow: 1\.25; \}/);
  assert.match(castCss, /clip-path: polygon\(0 0, calc\(100% - var\(--slot-cut\)\) 0, 100% var\(--slot-cut\), 100% 100%, 0 100%\);/);
  assert.match(castCss, /\.cast-style-slot\.is-standard \{ border-block: 1px solid/);
  assert.match(castJs, /<span class="cast-style-slot__index">\$\{style\.number\}<\/span>\s*<span class="cast-style-slot__name">\$\{escapeHtml\(style\.name\)\}<\/span>\s*\$\{style\.mark \?/);
});

test("style slots stay visible without the effect script and animate only with its class", () => {
  assert.doesNotMatch(runtimeCss, /cast-style-slot(?!\.cast-style-verify)[^{]*\{[^}]*(opacity:0|visibility:hidden)/);
  assert.doesNotMatch(runtimeCss + effectsCss, /cast-style-card-simple/);
  assert.match(runtimeCss, /#cast-styles \.cast-style-slot\.cast-style-verify\{animation:castStyleVerifyStrong/);
  assert.match(cyberTrigger, /querySelectorAll\('#cast-styles \.cast-style-slot'\)/);
  assert.doesNotMatch(archetypeView, /enhanceStyles|enhanceDivines|cast-divine-card/);
});

test("identity facts: one row with unequal columns, 2 x 2 in narrow identity columns, clipped values keep a title", () => {
  assert.match(castCss, /\.identity-grid \{ display: grid; grid-template-columns: 1fr 1\.7fr \.8fr 1fr;/);
  assert.match(castCss, /\.identity-grid > div \+ div \{ border-left: 1px solid/);
  assert.match(castCss, /\.identity-grid dd \{[^}]*text-overflow: ellipsis; white-space: nowrap; \}/);
  assert.match(castCss, /@container cast-identity \(max-width: 640px\) \{\s*\.identity-grid \{ grid-template-columns: 1fr 1fr; \}/);
  assert.match(castJs, /setIdentityValue\("#cast-affiliation", character\.affiliation\);/);
  assert.match(castJs, /if \(String\(value \?\? ""\)\.trim\(\)\) element\.title = element\.textContent;\s*else element\.removeAttribute\("title"\);/);
});

test("hero sub-sections and slots avoid theme-scope panel/card suffixes so themes do not re-frame them", () => {
  const classes = [...hero.matchAll(/class="([^"]+)"/g), ...castJs.matchAll(/<article class="(cast-(?:style|divine)-[^"$ ]+)/g)].map(match => match[1].trim());
  for (const value of classes) {
    assert.doesNotMatch(value, /-panel$|-panel |-card$|-card /, value);
  }
});

test("heading meta text truncates instead of wrapping the bilingual heading", () => {
  assert.match(castCss, /\.cast-hero-heading h2 \{[^}]*white-space: nowrap;/);
  assert.match(castCss, /\.cast-hero-heading__meta \{[^}]*text-overflow: ellipsis; white-space: nowrap; \}/);
});

test("hero type scale follows the design and the identity column width", () => {
  assert.match(castCss, /\.cast-handle \{[^}]*font-size: clamp\(1\.875rem, 4\.8cqi, 2\.875rem\);/);
  assert.match(castCss, /\.cast-name \{[^}]*font-size: clamp\(2rem, 5\.45cqi, 3\.25rem\);/);
  assert.match(castCss, /\.cast-name-primary rt \{[^}]*font-size: clamp\(10px, \.44em, 13px\);/);
  assert.match(castCss, /\.cast-style-slot\.is-featured \.cast-style-slot__name \{ font-size: clamp\(1\.1rem, 3\.1cqi, 1\.875rem\); \}/);
  assert.match(castCss, /\.cast-style-slot__name \{[^}]*font-size: clamp\(1rem, 2\.7cqi, 1\.625rem\);/);
  assert.match(castCss, /\.cast-divine-slot__name \{[^}]*font-size: clamp\(1rem, 2\.7cqi, 1\.625rem\);/);
  assert.doesNotMatch(castCss, /\.cast-name-primary \{[^}]*font-size/);
});
