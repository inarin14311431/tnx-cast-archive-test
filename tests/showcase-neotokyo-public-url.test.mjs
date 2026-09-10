import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("new showcase links expose standard and cinematic modes without the retired public parameter", async () => {
  const publisher = await read("js/showcase-dynamic-publish-v3.js");
  const loader = await read("js/showcase-generator-loader.js");
  const compat = await read("js/showcase-mode-compat.js");

  assert.match(
    publisher,
    /act-showcase-standard\.html\?id=\$\{encodeURIComponent\(slug\)\}/
  );
  assert.match(
    publisher,
    /act-showcase\.html\?id=\$\{encodeURIComponent\(slug\)\}/
  );
  assert.doesNotMatch(publisher, /showcaseMode=cinematic/);
  assert.doesNotMatch(publisher, /bgSample=neotokyo/);
  assert.match(loader, /showcase-dynamic-publish-v3\.js\?v=1/);

  // Existing shared links remain readable through an internal compatibility bridge.
  assert.match(compat, /showcaseMode/);
  assert.match(compat, /bgSample/);
  assert.match(compat, /mode === "cinematic"/);
});
