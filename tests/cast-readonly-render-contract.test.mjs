import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("readonly fields are applied after cast rendering without a broad observer", () => {
  const source = read("js/cast-ui.js");
  const start = source.indexOf("function initializeReadonlyFields");
  const end = source.indexOf("\nfunction parseReturnDestination", start);
  const initializer = source.slice(start, end);

  assert.match(initializer, /whenCastReady\(\(\) => apply\(content\)\)/);
  assert.doesNotMatch(initializer, /MutationObserver/);
  assert.doesNotMatch(initializer, /\.observe\(/);
});
