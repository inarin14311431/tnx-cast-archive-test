import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("troop experience correction uses mobile and quick-sheet render events", () => {
  const source = read("js/cast-troops-link.js");
  const start = source.indexOf("function watchUntilExperienceRendered");
  const end = source.indexOf("\nfunction setTextIfChanged", start);
  const initializer = source.slice(start, end);

  assert.match(initializer, /tnx:mobile-cast-rendered/);
  assert.match(initializer, /tnx:quick-sheet-rendered/);
  assert.match(initializer, /once: true/);
  assert.doesNotMatch(initializer, /MutationObserver/);
});

test("quick sheet announces completion after its DOM is generated", () => {
  const source = read("js/cast.js");
  assert.match(source, /quickSheetPages\.querySelectorAll\([\s\S]*?tnx:quick-sheet-rendered/);
});
