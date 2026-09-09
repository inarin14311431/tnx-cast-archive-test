import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const generatorHtml = readFileSync(new URL("../showcase-generator.html", import.meta.url), "utf8");
const publicHtml = readFileSync(new URL("../act-showcase.html", import.meta.url), "utf8");
const entryCss = readFileSync(new URL("../css-next/pages/showcase-entry.css", import.meta.url), "utf8");
const presets = readFileSync(new URL("../js/showcase-background-presets.js", import.meta.url), "utf8");
const picker = readFileSync(new URL("../js/showcase-background-preset-picker.js", import.meta.url), "utf8");
const resolver = readFileSync(new URL("../js/act-showcase-background-resolver.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../css-next/pages/showcase-background-presets.css", import.meta.url), "utf8");

test("generator exposes the canonical background preset picker wiring", () => {
  assert.match(generatorHtml, /id="background-preset-grid"/);
  assert.match(generatorHtml, /showcase-background-preset-picker\.js\?v=\d+/);
  assert.match(entryCss, /showcase-background-presets\.css\?v=\d+/);
  assert.doesNotMatch(generatorHtml, /<link[^>]+showcase-background-presets\.css/);
  assert.match(presets, /export const SHOWCASE_BACKGROUND_PRESETS/);
  assert.match(presets, /new URL\(/);
});

test("preset selection reuses the existing background URL publishing path", () => {
  assert.match(picker, /urlField\.value = preset\.url/);
  assert.match(picker, /fileField\.value = ""/);
  assert.match(picker, /aria-pressed/);
  assert.match(picker, /is-selected/);
});

test("manual background inputs can override a selected preset", () => {
  assert.match(picker, /urlField\.addEventListener\("input"/);
  assert.match(picker, /fileField\?\.addEventListener\("change"/);
  assert.match(picker, /keyField\.value = ""/);
});

test("cinematic presentation restores the published background after canonical rendering", () => {
  assert.match(publicHtml, /act-showcase-background-resolver\.js\?v=\d+/);
  assert.match(resolver, /params\.get\("id"\) \|\| params\.get\("act"\)/);
  assert.match(resolver, /get_public_act_showcase/);
  assert.match(resolver, /waitForShowcaseReady/);
  assert.match(resolver, /showcase-poster-v2-ready/);
  assert.match(resolver, /--showcase-background/);
  assert.match(resolver, /classList\.remove\("showcase-poster-sample-background"\)/);
});

test("preset UI remains usable without motion", () => {
  assert.match(css, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css, /!important/);
});
