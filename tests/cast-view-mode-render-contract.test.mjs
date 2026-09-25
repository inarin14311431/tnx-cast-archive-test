import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile cast mode toggle waits for the mobile render event", () => {
  const source = read("js/cast-view-mode.js");
  const start = source.indexOf("function bind()");
  const end = source.indexOf("\n    if (document.readyState", start);
  const initializer = source.slice(start, end);

  assert.match(initializer, /tnx:mobile-cast-rendered/);
  assert.match(initializer, /once: true/);
  assert.doesNotMatch(initializer, /MutationObserver/);
  assert.doesNotMatch(initializer, /\.observe\(/);
});

test("mobile cast view dispatches its render completion event after rendering", () => {
  const source = read("js/cast-mobile.js");
  assert.match(source, /render\(root,c,s,o,b\);window\.dispatchEvent\(new CustomEvent\(["']tnx:mobile-cast-rendered["']\)\)/);
});
