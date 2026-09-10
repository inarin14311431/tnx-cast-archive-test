import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

const [cinematicHtml, generatorHtml, modeCompat, urlCanonicalizer, followupCss, posterCss, supportingJs] = await Promise.all([
  read("act-showcase.html"),
  read("showcase-generator.html"),
  read("js/showcase-mode-compat.js"),
  read("js/showcase-publish-url-canonicalizer.js"),
  read("css-next/pages/act-showcase-followup-v1.css"),
  read("css-next/pages/act-showcase-poster-v2.css"),
  read("js/act-showcase-supporting-cast.js")
]);

test("cinematic route is defined by act-showcase.html and legacy showcaseMode is canonicalized away", () => {
  assert.match(cinematicHtml, /showcase-mode-compat\.js\?v=2/);
  assert.match(modeCompat, /act-showcase\\\.html/);
  assert.match(modeCompat, /return isCinematicPage\(\) \? "neotokyo" : value/);
  assert.match(modeCompat, /current\.searchParams\.delete\("showcaseMode"\)/);
  assert.match(generatorHtml, /showcase-generator-loader\.js\?v=27/);
  assert.match(urlCanonicalizer, /url\.searchParams\.delete\("showcaseMode"\)/);
});

test("selected ACT background is painted by the opening hero only", () => {
  assert.match(posterCss, /\.scene-opening:before\{[^}]*var\(--showcase-background\)/s);
  assert.match(followupCss, /\.ambient-stage::before,[\s\S]*\.poster-v2-board::before\{[\s\S]*display:none!important/);
  assert.match(followupCss, /\.poster-v2-board\{\s*background:#030813/);
});

test("cast matching has an explicit scanning state and an obvious completion state", () => {
  assert.match(followupCss, /neotokyo-sequence__search--linked>strong::before/);
  assert.match(followupCss, /content:"照合中"/);
  assert.match(followupCss, /neotokyo-sequence__search--linked\.is-found>strong::before/);
  assert.match(followupCss, /content:"✓"/);
  assert.match(followupCss, /content:"完了！"/);
  assert.match(followupCss, /@keyframes showcase-match-orbit/);
  assert.match(followupCss, /@keyframes showcase-match-check/);
});

test("poster guest descriptions are rendered in full without line clamping", () => {
  assert.match(supportingJs, /textNode\("p", guest\.summary, "poster-supporting-card__summary"\)/);
  assert.match(followupCss, /\.poster-supporting-card__summary\{[\s\S]*display:block!important/);
  assert.match(followupCss, /overflow:visible!important/);
  assert.match(followupCss, /-webkit-line-clamp:unset!important/);
  assert.match(followupCss, /white-space:pre-wrap/);
});
