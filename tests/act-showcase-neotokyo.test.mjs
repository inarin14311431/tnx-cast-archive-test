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

test("NeoTokyo intro follows act title, trailer, handout and cast assignment order", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  const opening = source.indexOf("await showOpening(state)");
  const title = source.indexOf("await showActTitle(state, model)");
  const trailer = source.indexOf("await showTrailer(state, model)");
  const handout = source.indexOf("await showHandoutAndAssign");
  const ready = source.indexOf("await showReady(state, model)");
  assert.ok(opening >= 0 && opening < title);
  assert.ok(title < trailer);
  assert.ok(trailer < handout);
  assert.ok(handout < ready);
  assert.match(source, /SEARCHING CAST\.\.\./);
  assert.match(source, /MATCH FOUND/);
  assert.match(source, /CAST ASSIGNED/);
  assert.match(source, /ALL CASTS\\nASSIGNED/);
  assert.match(source, /ACT READY/);
});

test("NeoTokyo intro supports public trailer data and safe missing-data fallback", async () => {
  const page = await read("js/act-showcase-page.js");
  const sequence = await read("js/act-showcase-neotokyo.js");
  assert.match(page, /data\.trailer \|\| data\.actTrailer \|\| data\.trailerText \|\| data\.trailerBody/);
  assert.match(sequence, /SAMPLE_TRAILER_MESSAGE/);
  assert.match(sequence, /公開用アクトトレーラーは未登録です/);
});

test("NeoTokyo intro has skip and reduced-motion exits", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  assert.match(source, /SKIP INTRO/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /state\.skipButton\.addEventListener\("click", finish/);
});

test("NeoTokyo assets are explicitly reachable from the showcase page", async () => {
  const html = await read("act-showcase.html");
  const page = await read("js/act-showcase-page.js");
  assert.match(html, /css-next\/pages\/act-showcase-neotokyo\.css/);
  assert.match(page, /act-showcase-neotokyo\.js/);
});

test("NeoTokyo cast images keep protocol validation", async () => {
  const source = await read("js/act-showcase-neotokyo.js");
  assert.match(source, /safeImageUrl/);
  assert.match(source, /\["http:", "https:"\]\.includes\(url\.protocol\)/);
});
