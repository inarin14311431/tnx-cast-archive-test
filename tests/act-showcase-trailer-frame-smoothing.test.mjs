import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("ACT TRAILER follow scrolling reacts to typed content as well as resize changes", async () => {
  const layout = await read("js/act-showcase-cinematic-layout-v2.js");
  assert.match(layout, /const supportsResizeObserver = typeof ResizeObserver === "function"/);
  assert.match(layout, /record\.type === "characterData"[\s\S]*scheduleTrailerFrame\(trailerReadout\)/);
  assert.match(layout, /new ResizeObserver\(\(\) => scheduleTrailerFrame\(readout\)\)/);
  assert.match(layout, /window\.addEventListener\("resize"[\s\S]*scheduleTrailerFrame\(readout\)/);
});

test("ACT TRAILER batches readout follow work into animation frames", async () => {
  const layout = await read("js/act-showcase-cinematic-layout-v2.js");
  assert.match(layout, /let trailerFrame = 0/);
  assert.match(layout, /cancelAnimationFrame\(trailerFrame\)/);
  assert.match(layout, /trailerFrame = requestAnimationFrame\(\(\) => updateTrailerFrame\(readout\)\)/);
});

test("ACT TRAILER follow scroll does not restart for the same readout target", async () => {
  const layout = await read("js/act-showcase-cinematic-layout-v2.js");
  assert.match(layout, /const trailerScrollTargets = new WeakMap\(\)/);
  assert.match(layout, /const previousTarget = trailerScrollTargets\.get\(readout\)/);
  assert.match(layout, /Math\.abs\(targetTop - previousTarget\) <= 1/);
  assert.match(layout, /trailerScrollTargets\.set\(readout, targetTop\)/);
  assert.match(layout, /readout\.scrollTo\(\{/);
  assert.doesNotMatch(layout, /stage\.scrollTo\(\{/);
});

test("ACT TRAILER uses one cache-busted layout owner and no legacy live-frame module", async () => {
  const bootstrap = await read("js/act-showcase-bootstrap.js");
  assert.match(bootstrap, /act-showcase-cinematic-layout-v2\.js\?v=[A-Za-z0-9._-]+/);
  assert.doesNotMatch(bootstrap, /act-showcase-trailer-live-frame\.js/);
});
