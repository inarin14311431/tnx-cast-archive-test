import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync("act-showcase.html", "utf8");
const app = fs.readFileSync("js/act-showcase.js", "utf8");

test("published ACT showcase URLs using ?act remain compatible with the showcase loader", () => {
  assert.match(html, /params\.has\("act"\)/);
  assert.match(html, /params\.set\("id", params\.get\("act"\)\)/);
  assert.match(app, /URLSearchParams\(location\.search\)\.get\("id"\)/);
});
