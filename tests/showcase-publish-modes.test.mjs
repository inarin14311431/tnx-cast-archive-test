import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("generator exposes separate standard and cinematic publication actions", async () => {
  const html = await read("showcase-generator.html");
  assert.match(html, /data-publish-mode="standard"/);
  assert.match(html, /従来版で公開/);
  assert.match(html, /data-publish-mode="cinematic"/);
  assert.match(html, /豪華版で公開/);
  assert.match(html, /id="publish-button"[^>]*hidden/);
});

test("dynamic publisher emits current publication URLs without retired mode/sample queries", async () => {
  const loader = await read("js/showcase-generator-loader.js");
  const publisher = await read("js/showcase-dynamic-publish-v3.js");
  assert.match(loader, /showcase-dynamic-publish-v3\.js\?v=1/);
  assert.doesNotMatch(loader, /showcase-dynamic-publish-v2\.js/);
  assert.match(publisher, /act-showcase-standard\.html\?id=/);
  assert.match(publisher, /act-showcase\.html\?id=/);
  assert.doesNotMatch(publisher, /showcaseMode=cinematic/);
  assert.doesNotMatch(publisher, /bgSample=neotokyo/);
});

test("standard public view uses the same public RPC and accepts the current trailer payload shape", async () => {
  const html = await read("act-showcase-standard.html");
  const source = await read("js/act-showcase-standard.js");
  assert.match(html, /act-showcase-standard\.js\?v=1/);
  assert.match(source, /get_public_act_showcase/);
  assert.match(source, /data\.trailer\.body/);
  assert.match(source, /data\.intro/);
});

test("legacy deluxe sample links remain readable only as compatibility behavior", async () => {
  const deluxe = await read("js/act-showcase-page.js");
  assert.match(deluxe, /params\.get\("bgSample"\)/);
  assert.match(deluxe, /sample === "neotokyo"/);
});
