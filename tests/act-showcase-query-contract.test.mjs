import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync("act-showcase.html", "utf8");
const app = fs.readFileSync("js/act-showcase.js", "utf8");
const publisher = fs.readFileSync("js/showcase-dynamic-publish.js", "utf8");

test("published ACT showcase URLs use the production id query contract", () => {
  assert.match(publisher, /act-showcase\.html\?id=\$\{encodeURIComponent\(slug\)\}/);
  assert.match(app, /URLSearchParams\(location\.search\)\.get\("id"\)/);
  assert.match(html, /\.\/js\/act-showcase\.js\?v=7/);
  assert.doesNotMatch(html, /params\.has\("act"\)/);
});
