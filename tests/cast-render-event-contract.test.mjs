import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("cast announces render completion after content becomes visible", () => {
  const cast = read("js/cast.js");
  assert.match(cast, /content\.hidden = false;\s*window\.dispatchEvent\(new CustomEvent\(["']tnx:cast-rendered["']\)\)/);
});

test("cast UI waits for the explicit render event instead of observing hidden", () => {
  const ui = read("js/cast-ui.js");
  const start = ui.indexOf("function whenCastReady");
  const closingBrace = /\r?\n\}\r?\n/.exec(ui.slice(start));
  const end = closingBrace ? start + closingBrace.index + closingBrace[0].length : ui.length;
  const initializer = ui.slice(start, end);

  assert.match(initializer, /tnx:cast-rendered/);
  assert.match(initializer, /once: true/);
  assert.doesNotMatch(initializer, /MutationObserver/);
});
