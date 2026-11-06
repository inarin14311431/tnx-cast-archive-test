import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// A visitor must never stay on the loading screen for good (docs/ACT_SHOWCASE_SCENES.md section 6.2): data that does not come is given up
// after 15 s, a module that does not load is reported, and a loading screen that lasts longer than 6 s says so and offers a reload.
const read = file => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("a public data request that gets no answer is given up after 15 seconds with a message, and the cache forgets it", async () => {
  const { loadPublicShowcase, PUBLIC_RPC_TIMEOUT_MS, PUBLIC_RPC_TIMEOUT_MESSAGE } = await import("../js/public-showcase-service.js");
  assert.equal(PUBLIC_RPC_TIMEOUT_MS, 15000);
  const realFetch = globalThis.fetch;
  let calls = 0;
  // a request that never answers; it ends only when it is aborted
  globalThis.fetch = (url, init) => {
    calls += 1;
    return new Promise((resolve, reject) => init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
  };
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const first = loadPublicShowcase("act-0021");
    const settled = assert.rejects(first, error => error.message === PUBLIC_RPC_TIMEOUT_MESSAGE);
    // the request is sent from a microtask: let it start (and arm its timer) before the clock moves
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 1);
    mock.timers.tick(PUBLIC_RPC_TIMEOUT_MS - 1);
    mock.timers.tick(1);
    await settled;
    // the failed request is forgotten: asking again sends a new one
    const second = loadPublicShowcase("act-0021");
    second.catch(() => {});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 2);
    mock.timers.tick(PUBLIC_RPC_TIMEOUT_MS);
  } finally {
    mock.timers.reset();
    globalThis.fetch = realFetch;
  }
});

test("an answer that comes in time is not cut off, and a network failure keeps its own error", async () => {
  const { loadPublicShowcaseGuests } = await import("../js/public-showcase-service.js");
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify([{ name: "協力者 K" }]), { status: 200, headers: { "content-type": "application/json" } });
    assert.deepEqual(await loadPublicShowcaseGuests("act-0030"), [{ name: "協力者 K" }]);
    globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
    await assert.rejects(loadPublicShowcaseGuests("act-0031"), error => error instanceof TypeError && /Failed to fetch/.test(error.message));
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("the bootstrap reports a module that did not load instead of ending the chain silently", async () => {
  const source = await read("js/act-showcase-bootstrap.js");
  assert.match(source, /import \{ showLoadError \} from "\.\/act-showcase-load-error\.js\?v=[0-9a-f]{8}";/);
  const tryStart = source.indexOf("try {");
  const catchStart = source.indexOf("} catch (error) {");
  assert.ok(tryStart > -1 && catchStart > tryStart, "the chain is inside a try block");
  const chain = source.slice(tryStart, catchStart);
  assert.equal((chain.match(/^\s*await import\(/gm) || []).length, 15, "all 15 imports are inside the try block");
  assert.match(source.slice(catchStart), /showLoadError\("ページの読み込みに失敗しました。/);
});

test("the page shows a failed or timed-out load through the same message with a reload link", async () => {
  const page = await read("js/act-showcase-page.js");
  assert.match(page, /import \{ showLoadError \} from "\.\/act-showcase-load-error\.js\?v=[0-9a-f]{8}";/);
  assert.match(page, /showLoadError\(error\?\.message \|\| "アクト紹介を読み込めませんでした。"\);/);
  const helper = await read("js/act-showcase-load-error.js");
  assert.match(helper, /intro\.classList\.add\("is-hidden"\)/);
  assert.match(helper, /status\.classList\.add\("is-error"\)/);
  assert.match(helper, /link\.href = location\.href/);
  assert.match(helper, /再読み込み/);
});

test("the loading screen has a 6-second watchdog with a reload link, and no colour of its own", async () => {
  const html = await read("act-showcase.html");
  const script = html.slice(html.indexOf("<script>"), html.indexOf("</script>"));
  assert.match(script, /}, 6000\);/);
  assert.match(script, /showcase-neotokyo-intro-active/);
  assert.match(script, /cinematic-intro__slow/);
  assert.match(script, /再読み込み/);
  assert.match(script, /reload\.href = location\.href/);
  // the note takes the colour of the loading screen (inherit); no #hex / rgb() in the inline style
  assert.doesNotMatch(script, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
});
