import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("showcase generator exposes ACT TRAILER instead of intro wording", async () => {
  const html = await read("showcase-generator.html");
  assert.match(html, /アクトトレーラー/);
  assert.match(html, /ACT TRAILER \/\/ プレアクトで読み上げるトレーラー/);
  assert.match(html, /id="intro-text"/);
  assert.doesNotMatch(html, />イントロ文</);
});

test("dynamic publish version 2 stores trailer and not legacy intro", async () => {
  const loader = await read("js/showcase-generator-loader.js");
  const publisher = await read("js/showcase-dynamic-publish-v2.js");
  assert.match(loader, /showcase-dynamic-publish-v2\.js\?v=1/);
  assert.match(publisher, /version: 2/);
  assert.match(publisher, /trailer: trailerBody \? \{ title: "ACT TRAILER", body: trailerBody \} : null/);
  assert.doesNotMatch(publisher, /\n\s*intro:/);
});

test("showcase publish normalizes nested handle quotation marks without changing stored character data", async () => {
  const publisher = await read("js/showcase-dynamic-publish-v2.js");
  const normalizer = await read("js/showcase-handle-normalizer.js");
  assert.match(publisher, /normalizeDisplayQuotes/);
  assert.match(publisher, /fullName: normalizeDisplayQuotes/);
  assert.match(publisher, /replace\(\/“\\s\*\[“\"「『‘'\]\+\/g, "“"\)/);
  assert.match(normalizer, /cast-pick-card__handle/);
  assert.match(normalizer, /selected-cast__identity h3/);
  assert.doesNotMatch(normalizer, /supabase|\.update\(|\.insert\(|\.upsert\(/i);
});

test("NeoTokyo cinematic enhancer is loaded before the canonical page module", async () => {
  const html = await read("act-showcase.html");
  const enhancerIndex = html.indexOf("act-showcase-cinematic-enhancer.js");
  const pageIndex = html.indexOf("act-showcase-page.js");
  assert.ok(enhancerIndex >= 0);
  assert.ok(pageIndex > enhancerIndex);
  assert.match(html, /act-showcase-cinematic\.css/);
});

test("legacy intro data is bridged to ACT TRAILER only for NeoTokyo presentation", async () => {
  const enhancer = await read("js/act-showcase-cinematic-enhancer.js");
  assert.match(enhancer, /bgSample/);
  assert.match(enhancer, /data\.intro/);
  assert.match(enhancer, /data\.trailer = \{ title: "ACT TRAILER", body: data\.intro\.trim\(\) \}/);
  assert.match(enhancer, /\/rest\/v1\/rpc\/get_public_act_showcase/);
});

test("act title is forced to a single line and receives a cinematic reveal", async () => {
  const enhancer = await read("js/act-showcase-cinematic-enhancer.js");
  const css = await read("css-next/pages/act-showcase-cinematic.css");
  assert.match(enhancer, /fitSingleLineTitle/);
  assert.match(enhancer, /title\.style\.whiteSpace = "nowrap"/);
  assert.match(enhancer, /title\.scrollWidth > available/);
  assert.match(enhancer, /is-cinematic-title/);
  assert.match(css, /white-space:nowrap/);
  assert.match(css, /@keyframes cinematic-act-title/);
});

test("SYSTEM ACCESS uses a dedicated cinematic access treatment", async () => {
  const enhancer = await read("js/act-showcase-cinematic-enhancer.js");
  const css = await read("css-next/pages/act-showcase-cinematic.css");
  assert.match(enhancer, /ACT FILE \/\/ ACCESS/);
  assert.match(enhancer, /PUBLIC ACCESS \/\/ AUTHORIZED/);
  assert.match(css, /cinematic-aperture/);
  assert.match(css, /cinematic-access-scan/);
});

test("ACT TRAILER is presented as PC terminal input with a blinking cursor", async () => {
  const enhancer = await read("js/act-showcase-cinematic-enhancer.js");
  const css = await read("css-next/pages/act-showcase-cinematic.css");
  assert.match(enhancer, /ACT_TRAILER\.TXT/);
  assert.match(enhancer, /INPUT MODE \/\/ REC/);
  assert.match(enhancer, /is-terminal-readout/);
  assert.match(css, /cinematic-cursor/);
  assert.match(css, /Share Tech Mono/);
});

test("separate act overview blocks are suppressed in the cinematic sequence", async () => {
  const css = await read("css-next/pages/act-showcase-cinematic.css");
  const enhancer = await read("js/act-showcase-cinematic-enhancer.js");
  assert.match(css, /neotokyo-sequence__act-overview\{display:none\}/);
  assert.match(css, /neotokyo-sequence__overview-intro-label/);
  assert.match(enhancer, /neotokyo-sequence__act-overview/);
});

test("cinematic override follows CSS audit rule and contains no important declarations", async () => {
  const css = await read("css-next/pages/act-showcase-cinematic.css");
  assert.doesNotMatch(css, /!important/);
});
