import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("reduced-motion bridge loads before the NeoTokyo page module", async () => {
  const html = await read("act-showcase.html");
  const bridgeIndex = html.indexOf("act-showcase-reduced-motion-sequence-bridge.js");
  const pageIndex = html.indexOf("act-showcase-page.js");
  assert.ok(bridgeIndex >= 0, "reduced-motion bridge must be loaded");
  assert.ok(pageIndex > bridgeIndex, "bridge must load before the page module");
});

test("reduced-motion keeps the NeoTokyo sequence while preserving the user's motion preference afterwards", async () => {
  const bridge = await read("js/act-showcase-reduced-motion-sequence-bridge.js");
  const sequence = await read("js/act-showcase-neotokyo.js");
  const css = await read("css-next/pages/act-showcase-neotokyo.css");

  assert.match(sequence, /if \(prefersReducedMotion\(\)\)/);
  assert.match(bridge, /nativeMatchMedia\(reduceQuery\)\.matches/);
  assert.match(bridge, /showcase-neotokyo-reduced/);
  assert.match(bridge, /if \(property === "matches"\) return false/);
  assert.match(bridge, /queueMicrotask\(\(\) => \{\s*window\.matchMedia = nativeMatchMedia;/s);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(sequence, /await showOpening\(state\)/);
  assert.match(sequence, /await showActTitle\(state, model\)/);
  assert.match(sequence, /await showTrailer\(state, model\)/);
  assert.match(sequence, /await showHandoutAndAssign/);
  assert.match(sequence, /await showSummary\(state, model\)/);
});

test("bridge is scoped to NeoTokyo URLs only", async () => {
  const bridge = await read("js/act-showcase-reduced-motion-sequence-bridge.js");
  assert.match(bridge, /params\.get\("bgSample"\)/);
  assert.match(bridge, /!== "neotokyo"\) return/);
});
