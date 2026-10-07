import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../js/act-showcase-page.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../css-next/pages/act-showcase-core.css", import.meta.url), "utf8");

test("キャスト選択は本体グリッドより上段に置き、1人のときは出さない", () => {
  const rosterAppend = page.indexOf("frame.append(roster);");
  const gridAppend = page.indexOf("frame.append(grid);");
  assert.ok(rosterAppend > 0 && gridAppend > rosterAppend, "roster is appended before the cast grid");
  assert.match(page, /if \(model\.casts\.length > 1\) \{\s*roster = createRoster/);
  assert.match(page, /poster-v2-frame poster-v2-frame--select/);
});

test("選択カードは顔サムネ(画像フォーカス共通)と aria-pressed / キーボード操作を持つ", () => {
  const roster = page.slice(page.indexOf("function createRoster("), page.indexOf("function setActiveRosterItem("));
  assert.match(roster, /createCastImage\(cast, \{ alt: "", loading: "lazy" \}\)/);
  assert.match(roster, /setAttribute\("aria-pressed"/);
  for (const key of ["Enter", '" "', "ArrowRight", "ArrowLeft"]) assert.ok(roster.includes(key), `${key} is handled`);
  const image = page.slice(page.indexOf("function createCastImage("), page.indexOf("function createVisualPanel("));
  for (const helper of ["getImageObjectPosition", "getImageScale", "getImageTransformOrigin"]) assert.ok(image.includes(helper));
  assert.match(image, /scan-failed\.webp/);
});

test("パネル3枚の順序(visual, profile, handout)とヒーローの画像alt・名前ブロックを保つ", () => {
  const grid = page.slice(page.indexOf("function createCastGrid("), page.indexOf("function createCastImage("));
  assert.ok(grid.indexOf("grid.append(visual, profile)") > 0);
  assert.ok(grid.indexOf("grid.append(handout)") > grid.indexOf("grid.append(visual, profile)"));
  assert.match(page, /alt: text\(cast\?\.imageAlt\) \|\| name/);
  const profile = page.slice(page.indexOf("function createProfilePanel("), page.indexOf("function createHandoutPanel("));
  assert.match(profile, /poster-v2-identity/);
  assert.match(profile, /poster-v2-details/);
  assert.match(profile, /VIEW FULL PROFILE/);
});

test("キャスト切り替えの演出は reduced-motion で無効", () => {
  assert.match(page, /switching: true/);
  assert.match(css, /poster-v2-grid--select\.is-cast-switch\{animation:poster-v2-cast-switch/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{[^@]*is-cast-switch\{animation:none\}/);
  assert.match(css, /showcase-poster-v2-reduced \.poster-v2-frame--select \.poster-v2-grid--select\.is-cast-switch\{animation:none\}/);
});

test("キャストセレクトの文字は10px未満にしない", () => {
  const block = css.slice(css.indexOf("poster-v2 キャストセレクト型レイアウト"));
  const sizes = [...block.matchAll(/font:\d+ (\d+(?:\.\d+)?)px\//g)].map(match => Number(match[1]));
  assert.ok(sizes.length > 5);
  assert.ok(Math.min(...sizes) >= 10, `smallest font ${Math.min(...sizes)}px`);
});
