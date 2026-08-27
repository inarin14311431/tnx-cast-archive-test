import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helper = fs.readFileSync("js/async-timeout.js", "utf8");
const sources = [
  fs.readFileSync("js/account.js", "utf8"),
  fs.readFileSync("js/acts-app.js", "utf8"),
  fs.readFileSync("js/showcase-dynamic-publish.js", "utf8")
];

test("shared helper owns only timeout timer mechanics", () => {
  assert.match(helper, /Promise\.race/);
  assert.match(helper, /setTimeout/);
  assert.match(helper, /clearTimeout/);
  assert.doesNotMatch(helper, /busy|disabled|confirm|supabase/i);
});

test("page modules retain their own operation semantics", () => {
  for (const source of sources) assert.match(source, /withRequestTimeout/);
  assert.match(sources[0], /runAccountWrite/);
  assert.match(sources[1], /setBusy/);
  assert.match(sources[2], /publishing = false/);
});
