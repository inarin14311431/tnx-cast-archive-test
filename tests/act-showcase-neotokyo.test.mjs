import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("NeoTokyo intro is gated by bgSample without replacing the canonical renderer", async () => {
  const source = await read("js/act-showcase-page.js");
  assert.match(source, /sample === "neotokyo"/);
  assert.match(source, /prepareNeoTokyoLoading\(cinematicIntro\)/);
  assert.match(source, /runNeoTokyoIntro\(\{ intro: cinematicIntro, model \}\)/);
  assert.match(source, /renderPoster\(model\)/);
  assert.match(source, /get_public_act_showcase/);
});

test("NeoTokyo phases 1 and 2 are automatic while later phases wait for click", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  const opening = source.indexOf("await showOpening(state)");
  const title = source.indexOf("await showActTitle(state, model)");
  const trailer = source.indexOf("await showTrailer(state, model)");
  const handout = source.indexOf("await showHandoutAndAssign");
  const summary = source.indexOf("await showSummary(state, model)");
  assert.ok(opening >= 0 && opening < title);
  assert.ok(title < trailer);
  assert.ok(trailer < handout);
  assert.ok(handout < summary);

  const openingBody = source.slice(source.indexOf("async function showOpening"), source.indexOf("async function showActTitle"));
  const titleBody = source.slice(source.indexOf("async function showActTitle"), source.indexOf("async function showTrailer"));
  const trailerBody = source.slice(source.indexOf("async function showTrailer"), source.indexOf("async function showHandoutAndAssign"));
  assert.doesNotMatch(openingBody, /waitForAdvance/);
  assert.doesNotMatch(titleBody, /waitForAdvance/);
  assert.match(trailerBody, /waitForAdvance\(state, "NEXT \/\/ HANDOUT 01"\)/);
  assert.match(source, /waitForAdvance\(state, `ASSIGN \/\/ PC\$\{pcNumber\}`\)/);
  assert.match(source, /NEXT \/\/ ACT SUMMARY/);
  assert.match(source, /OPEN FULL SHOWCASE/);
});

test("NeoTokyo system access, credits and trailer have distinct semantic roles", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  assert.match(source, /01 \/\/ SYSTEM ACCESS/);
  assert.match(source, /02 \/\/ TITLE & CREDITS/);
  assert.match(source, /ACT OVERVIEW \/\/ アクト概要/);
  assert.match(source, /03 \/\/ ACT TRAILER/);
  assert.match(source, /プレアクトで読み上げるトレーラー/);
  assert.doesNotMatch(source, /neotokyo-sequence__rail/);
  assert.doesNotMatch(source, /title: "OPENING"/);
});

test("NeoTokyo ruler is treated as a title credit and remains prominent in summary", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  const css = await read("css-next/pages/act-showcase-neotokyo-hierarchy.css");
  assert.match(source, /createRulerCredit\(model\.rulerName\)/);
  assert.match(source, /RULER/);
  assert.match(source, /ACT DIRECTION \/\/ TITLE CREDIT/);
  assert.match(source, /createSummaryRuler\(model\.rulerName\)/);
  assert.match(css, /neotokyo-sequence__ruler-name/);
  assert.match(css, /border-left:3px solid #ff79d3/);
  assert.match(css, /body\.showcase-neotokyo #opening-ruler/);
});

test("NeoTokyo handout remains visible and shifts left while ASSIGN opens on the right", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  const css = await read("css-next/pages/act-showcase-neotokyo-linked.css");
  const body = source.slice(source.indexOf("async function showHandoutAndAssign"), source.indexOf("function createAssignedCast"));

  assert.match(body, /neotokyo-sequence__screen--linked/);
  assert.match(body, /neotokyo-sequence__handout-panel/);
  assert.match(body, /neotokyo-sequence__assign-panel/);
  assert.match(body, /neotokyo-sequence__link-bridge/);
  assert.match(body, /sequence\.classList\.add\("is-splitting"\)/);
  assert.match(body, /assignPanel\.replaceChildren\(search\)/);
  assert.match(body, /assignPanel\.replaceChildren\(castCard\)/);
  assert.doesNotMatch(body, /swapScreen\(state, assign\)/);

  assert.match(css, /is-splitting .*grid-template-columns/s);
  assert.match(css, /neotokyo-sequence__link-pulse/);
  assert.match(css, /neotokyo-linked-cast-in/);
  assert.match(css, /clip-path:inset\(0 100% 0 0\)/);
});

test("participation role is an explicit ASSIGN slot, not a fallback handout title", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  const css = await read("css-next/pages/act-showcase-neotokyo-hierarchy.css");
  const handoutBody = source.slice(source.indexOf("async function showHandoutAndAssign"), source.indexOf("function createAssignedCast"));
  assert.match(handoutBody, /const handoutTitle = clean\(handout\.title\) \|\| `PC\$\{pcNumber\} HANDOUT`/);
  assert.doesNotMatch(handoutBody, /handoutTitle = .*participationRole/);
  assert.match(source, /ASSIGN SLOT \/\/ 参加スタイル枠/);
  assert.match(source, /getParticipationRole/);
  assert.match(source, /participation_role/);
  assert.match(source, /roleMatchesStyle/);
  assert.match(css, /neotokyo-sequence__role-slot/);
  assert.match(css, /span\.is-role/);
});

test("NeoTokyo assignment preserves search, match and assigned sequence", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  assert.match(source, /SEARCHING CAST\.\.\./);
  assert.match(source, /MATCH FOUND/);
  assert.match(source, /CAST ASSIGNED/);
  assert.match(source, /ALL CASTS ASSIGNED/);
  assert.match(source, /ACT READY/);
});

test("NeoTokyo final phase contains one-screen act overview, ruler, role and cast summary", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  const css = await read("css-next/pages/act-showcase-neotokyo.css");
  assert.match(source, /ACT FILE \/\/ FINAL OVERVIEW/);
  assert.match(source, /CAST FILES \/\/ ASSIGNMENT ROSTER/);
  assert.match(source, /createSummaryCast/);
  assert.match(source, /createSummaryRuler/);
  assert.match(source, /neotokyo-sequence__summary-cast-role/);
  assert.match(source, /model\.trailer \|\| SAMPLE_TRAILER_MESSAGE/);
  assert.match(css, /neotokyo-sequence__summary-grid/);
  assert.match(css, /neotokyo-sequence__summary-casts/);
  assert.match(css, /overflow:hidden/);
});

test("NeoTokyo loader stays hidden after phase 6 exits", async () => {
  const html = await read("act-showcase.html");
  const css = await read("css-next/pages/act-showcase-neotokyo-hierarchy.css");
  const page = await read("js/act-showcase-page.js");
  assert.match(html, /id="act-showcase-status" class="showcase-loading"/);
  assert.match(page, /status\.hidden = true/);
  assert.match(css, /^\.showcase-loading\[hidden\]\{display:none\}/);
});

test("NeoTokyo intro supports public trailer data and safe missing-data fallback", async () => {
  const page = await read("js/act-showcase-page.js");
  const sequence = await read("js/act-showcase-neotokyo.js");
  assert.match(page, /data\.trailer \|\| data\.actTrailer \|\| data\.trailerText \|\| data\.trailerBody/);
  assert.match(sequence, /SAMPLE_TRAILER_MESSAGE/);
  assert.match(sequence, /公開用アクトトレーラーは未登録です/);
});

test("NeoTokyo sequence has skip, explicit advance control and reduced-motion exit", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  assert.match(source, /SKIP SEQUENCE/);
  assert.match(source, /CLICK TO CONTINUE/);
  assert.match(source, /requestAdvance/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /state\.skipButton\.addEventListener\("click", finish/);
});

test("NeoTokyo assets are explicitly reachable from the showcase page", async () => {
  const html = await read("act-showcase.html");
  const page = await read("js/act-showcase-page.js");
  assert.match(html, /css-next\/pages\/act-showcase-neotokyo\.css/);
  assert.match(html, /css-next\/pages\/act-showcase-neotokyo-linked\.css/);
  assert.match(html, /css-next\/pages\/act-showcase-neotokyo-hierarchy\.css/);
  assert.match(page, /act-showcase-neotokyo\.js/);
});

test("NeoTokyo cast images keep protocol validation", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  assert.match(source, /safeImageUrl/);
  assert.match(source, /\["http:", "https:"\]\.includes\(url\.protocol\)/);
});

test("assigned cast remains visible when reduced motion disables its animation", async () => {
  const css = await read("css-next/pages/act-showcase-neotokyo.css");
  const rule = css.match(/\.neotokyo-sequence__cast\{([^}]+)\}/)[1];
  assert.match(rule, /opacity:1;/);
  assert.match(rule, /transform:none;/);
});
