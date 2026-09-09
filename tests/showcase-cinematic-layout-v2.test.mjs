import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../act-showcase.html", import.meta.url), "utf8");
const loader = await readFile(new URL("../js/showcase-generator-loader.js", import.meta.url), "utf8");
const subtitle = await readFile(new URL("../js/showcase-act-subtitle.js", import.meta.url), "utf8");
const background = await readFile(new URL("../js/act-showcase-background-resolver.js", import.meta.url), "utf8");
const cinematic = await readFile(new URL("../js/act-showcase-cinematic-layout-v2.js", import.meta.url), "utf8");
const css = await readFile(new URL("../css-next/pages/act-showcase-cinematic-v2.css", import.meta.url), "utf8");

test("generator separates ACT title and subtitle before dynamic publishing", () => {
  const subtitleImport = loader.search(/import\("\.\/showcase-act-subtitle\.js\?v=\d+"\)/);
  const publisherImport = loader.search(/import\("\.\/showcase-dynamic-publish-v3\.js\?v=\d+"\)/);
  assert.ok(subtitleImport >= 0);
  assert.ok(publisherImport > subtitleImport);
  assert.match(subtitle, /subtitleInput\.id = "act-subtitle"/);
  assert.match(subtitle, /subtitleLabel\.append\("サブタイトル"\)/);
  assert.match(subtitle, /node\.textContent = "アクトタイトル"/);
  assert.match(subtitle, /doc\.querySelector\("\.hero h1 span"\)/);
  assert.match(subtitle, /showcaseData\?\.heroSubTitle/);
});

test("legacy trailer helper wording is no longer presented in the generator", () => {
  assert.match(subtitle, /helper\.textContent = "ACT TRAILER"/);
  assert.doesNotMatch(subtitle, /helper\.textContent = "プレアクトで読み上げるトレーラー"/);
});

test("published background is restored from showcase data for current and legacy cinematic URLs", () => {
  assert.match(background, /params\.get\("id"\) \|\| params\.get\("act"\)/);
  assert.match(background, /get_public_act_showcase/);
  assert.match(background, /payload\?\.background/);
  assert.match(background, /showcase-published-background-restored/);
  assert.doesNotMatch(background, /if \(!hasLegacyBackgroundParam\(\)\) return/);
});

test("cinematic title is multiline-safe and renders a separate subtitle", () => {
  assert.match(cinematic, /neotokyo-sequence__act-subtitle/);
  assert.match(css, /white-space:normal/);
  assert.match(css, /act-title--logo\.showcase-fit-title\{[\s\S]*?white-space:normal/);
  assert.match(css, /act-title--logo\.showcase-fit-title\[data-fit="medium"\]/);
  assert.match(css, /\.neotokyo-sequence__act-subtitle\s*\{/);
  assert.match(css, /font:700 clamp\(1\.35rem,2\.5vw,2\.85rem\)/);
  assert.doesNotMatch(css, /white-space:normal!important/);
});

test("cinematic trailer uses the screen as the scrolling surface and follows the typewriter", () => {
  assert.match(cinematic, /--showcase-trailer-live-height/);
  assert.match(cinematic, /readout\.scrollTop = readout\.scrollHeight/);
  assert.match(cinematic, /screen\.scrollTop = screen\.scrollHeight/);
  assert.match(cinematic, /new ResizeObserver/);
  assert.match(css, /height:var\(--showcase-trailer-live-height,94px\)/);
  assert.match(css, /scrollbar-gutter:stable/);
  assert.match(css, /screen--trailer \.neotokyo-sequence__readout\{[\s\S]*?max-height:none;[\s\S]*?overflow:visible/);
  assert.doesNotMatch(css, /--showcase-trailer-live-height,94px\)!important/);
});

test("assigned cast removes suit marks only from the participation slot and keeps three full style cards", () => {
  assert.match(cinematic, /neotokyo-sequence__role-slot strong/);
  assert.match(cinematic, /replace\(\/\[◎●\]\/g, ""\)/);
  assert.match(cinematic, /fitAssignedTagline/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /min-height:46px/);
  assert.match(css, /span\.is-role-primary/);
  assert.match(css, /white-space:nowrap/);
});

test("cinematic presentation removes fake navigation and duplicate trailer labels", () => {
  assert.match(cinematic, /removeFakeNavigation/);
  assert.match(cinematic, /\.poster-v2-nav/);
  assert.match(cinematic, /neotokyo-sequence__trailer-definition,.cinematic-trailer-band/);
  assert.match(css, /poster-v2-nav\{display:none\}/);
  assert.match(css, /cinematic-trailer-band\{display:none\}/);
  assert.doesNotMatch(css, /poster-v2-nav\{display:none!important\}/);
});

test("opening and title stages use the published background without forcing a zoom crop", () => {
  assert.match(css, /var\(--showcase-background\)/);
  assert.match(css, /background-size:cover,contain/);
  assert.match(css, /background-size:contain/);
});

test("finished cinematic sequence starts at the true top then reveals the first cast after one second", () => {
  assert.match(cinematic, /getFinalCastTarget/);
  assert.match(cinematic, /#poster-showcase-board-v2 \.poster-v2-panel--visual/);
  assert.match(cinematic, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
  assert.match(cinematic, /showcase-cast-entry-pending/);
  assert.match(cinematic, /showcase-cast-entry-reveal/);
  assert.match(cinematic, /scrollend/);
  assert.match(cinematic, /1000/);
  assert.match(cinematic, /target\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(css, /#scene-opening\{min-height:100svh\}/);
  assert.match(css, /showcase-cast-entry-reveal/);
});

test("cinematic v2 presentation assets are wired into the public page", () => {
  assert.match(html, /act-showcase-cinematic-v2\.css\?v=\d+/);
  assert.match(html, /act-showcase-cinematic-layout-v2\.js\?v=\d+/);
  assert.match(html, /act-showcase-background-resolver\.js\?v=\d+/);
});
