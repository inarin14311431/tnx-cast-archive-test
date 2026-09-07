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

test("NeoTokyo assignment still preserves search, match and assigned sequence", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  assert.match(source, /SEARCHING CAST\.\.\./);
  assert.match(source, /MATCH FOUND/);
  assert.match(source, /CAST ASSIGNED/);
  assert.match(source, /ALL CASTS ASSIGNED/);
  assert.match(source, /ACT READY/);
});

test("NeoTokyo final phase contains one-screen act overview and cast summary", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  const css = await read("css-next/pages/act-showcase-neotokyo.css");
  assert.match(source, /ACT OVERVIEW/);
  assert.match(source, /CAST FILES/);
  assert.match(source, /createSummaryCast/);
  assert.match(source, /model\.trailer \|\| SAMPLE_TRAILER_MESSAGE/);
  assert.match(css, /neotokyo-sequence__summary-grid/);
  assert.match(css, /neotokyo-sequence__summary-casts/);
  assert.match(css, /-webkit-line-clamp:9/);
  assert.match(css, /overflow:hidden/);
});

test("NeoTokyo intro supports public trailer data and safe missing-data fallback", async () => {
  const page = await read("js/act-showcase-page.js");
  const sequence = await read("js/act-showcase-neotokyo.js");
  assert.match(page, /data\.trailer \|\| data\.actTrailer \|\| data\.trailerText \|\| data\.trailerBody/);
  assert.match(sequence, /SAMPLE_TRAILER_MESSAGE/);
  assert.match(sequence, /公開用アクトトレーラーは未登録です/);
});

test("NeoTokyo intro has skip, explicit advance control and reduced-motion exit", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  assert.match(source, /SKIP INTRO/);
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
  assert.match(page, /act-showcase-neotokyo\.js/);
});

test("NeoTokyo cast images keep protocol validation", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  assert.match(source, /safeImageUrl/);
  assert.match(source, /\["http:", "https:"\]\.includes\(url\.protocol\)/);
});
