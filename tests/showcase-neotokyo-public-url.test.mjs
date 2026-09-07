import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("published showcase links preserve NeoTokyo cinematic mode", async () => {
  const publisher = await read("js/showcase-dynamic-publish-v2.js");
  const loader = await read("js/showcase-generator-loader.js");

  assert.match(
    publisher,
    /act-showcase\.html\?id=\$\{encodeURIComponent\(slug\)\}&bgSample=neotokyo/
  );
  assert.match(loader, /showcase-dynamic-publish-v2\.js\?v=2/);
});
