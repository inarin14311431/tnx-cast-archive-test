import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("act showcase loads one canonical page renderer", async () => {
  const html = await read("act-showcase.html");
  assert.match(html, /js\/act-showcase-page\.js/);
  assert.doesNotMatch(html, /js\/act-showcase-adaptive\.js/);
  assert.doesNotMatch(html, /js\/act-showcase-poster-bg\.js/);
  assert.doesNotMatch(html, /js\/act-showcase-poster-v2\.js/);
  assert.doesNotMatch(html, /css-next\/pages\/act-showcase-adaptive\.css/);
});

test("act showcase no longer carries the retired six-scene DOM", async () => {
  const html = await read("act-showcase.html");
  for (const retired of ["scene-trailer", "scene-handout", "scene-cast", "scene-data", "scene-end", "scene-progress"]) {
    assert.doesNotMatch(html, new RegExp(retired));
  }
  assert.match(html, /id="scene-opening"/);
  assert.match(html, /id="showcase-story"/);
});

test("canonical renderer consumes public showcase data directly", async () => {
  const source = await read("js/act-showcase-page.js");
  assert.match(source, /get_public_act_showcase/);
  assert.match(source, /createShowcaseModel\(data\)/);
  assert.match(source, /renderPoster\(model\)/);
  assert.match(source, /model\.casts/);
  assert.doesNotMatch(source, /MutationObserver/);
  assert.doesNotMatch(source, /querySelectorAll\("#showcase-casts \.cast-card"\)/);
});

test("canonical renderer preserves public URL and link safety", async () => {
  const source = await read("js/act-showcase-page.js");
  assert.match(source, /normalizeSlug/);
  assert.match(source, /safeImageUrl/);
  assert.match(source, /safeLinkUrl/);
  assert.match(source, /\["http:", "https:"\]\.includes\(url\.protocol\)/);
});
