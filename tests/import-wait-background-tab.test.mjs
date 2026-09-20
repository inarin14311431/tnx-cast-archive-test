import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// js/sheet-import.js's wait() is an internal const inside an IIFE, not
// exported, so it can't be imported directly. We extract its exact source
// from the shipped file and evaluate it against a fake `document` whose
// `hidden` flag we control, so this test exercises the real code instead of
// a hand-copied duplicate that could silently drift out of sync.
function extractWait(source) {
  const start = source.indexOf("const wait=");
  assert.notEqual(start, -1, "const wait=... not found in js/sheet-import.js");
  const end = source.indexOf("\n  const cleanName=", start);
  assert.notEqual(end, -1, "could not find the end of the wait() declaration");
  const declaration = source.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function("document", "requestAnimationFrame", "setTimeout", `${declaration}\nreturn wait;`);
}

test("wait() source still branches on document.hidden between rAF and setTimeout", async () => {
  const source = await read("js/sheet-import.js");
  assert.match(source, /if\(document\.hidden\)setTimeout\(resolve,32\)/);
  assert.match(source, /else requestAnimationFrame\(\(\)=>requestAnimationFrame\(resolve\)\)/);
});

test("wait() resolves via requestAnimationFrame when the document is visible", async () => {
  const source = await read("js/sheet-import.js");
  const factory = extractWait(source);

  let rafCalls = 0;
  let timeoutCalls = 0;
  const fakeRaf = callback => { rafCalls += 1; return setTimeout(callback, 0); };
  const fakeSetTimeout = (callback, ms) => { timeoutCalls += 1; return setTimeout(callback, ms); };

  const wait = factory({ hidden: false }, fakeRaf, fakeSetTimeout);
  await wait();

  assert.equal(rafCalls, 2, "should chain two requestAnimationFrame calls when visible");
  assert.equal(timeoutCalls, 0, "should not fall back to setTimeout when visible");
});

test("wait() resolves via setTimeout, never touching requestAnimationFrame, when the document is hidden", async () => {
  const source = await read("js/sheet-import.js");
  const factory = extractWait(source);

  let rafCalls = 0;
  let timeoutCalls = 0;
  const fakeRaf = () => { rafCalls += 1; throw new Error("requestAnimationFrame must not be called while hidden"); };
  const fakeSetTimeout = (callback, ms) => { timeoutCalls += 1; return setTimeout(callback, ms); };

  const wait = factory({ hidden: true }, fakeRaf, fakeSetTimeout);
  await wait();

  assert.equal(rafCalls, 0, "must not call requestAnimationFrame while hidden");
  assert.equal(timeoutCalls, 1, "should resolve via a single setTimeout while hidden");
});

// This mirrors the manual experiment used to diagnose the bug in a real
// browser: chaining 400 raw requestAnimationFrame calls (js/sheet-import.js's
// old pacing, and the shape a real import needs ~300-400 of for a
// many-skill character, computed from real character-sheets.appspot.com
// data) made zero progress after ~16 real seconds while the tab was hidden,
// and only completed once it became visible again. Node has no
// requestAnimationFrame/visibility model to reproduce *that* platform
// behavior directly, but this confirms every one of those calls now takes
// the setTimeout branch while hidden, so they keep completing instead of
// stalling. Kept to 50 (not 400) so the suite doesn't spend ~13s here.
test("many consecutive wait() calls all resolve promptly while hidden, unlike raw chained rAF", async () => {
  const source = await read("js/sheet-import.js");
  const factory = extractWait(source);

  let rafCalls = 0;
  const fakeRaf = () => { rafCalls += 1; throw new Error("requestAnimationFrame must not be called while hidden"); };
  const wait = factory({ hidden: true }, fakeRaf, setTimeout);

  const iterations = 50;
  const startedAt = Date.now();
  for (let i = 0; i < iterations; i += 1) await wait();
  const elapsedMs = Date.now() - startedAt;

  assert.equal(rafCalls, 0);
  assert.ok(elapsedMs < 15000, `${iterations} hidden-tab wait() calls took ${elapsedMs}ms, expected well under 15s`);
});
