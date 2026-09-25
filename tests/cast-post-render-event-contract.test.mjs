import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("troop experience correction uses the cast rendered event", () => {
  const source = read("js/cast-troops-link.js");
  const start = source.indexOf("function watchDesktopExperience");
  const end = source.indexOf("\nfunction watchUntilExperienceRendered", start);
  const initializer = source.slice(start, end);

  assert.match(initializer, /tnx:cast-rendered/);
  assert.match(initializer, /once: true/);
  assert.doesNotMatch(initializer, /MutationObserver/);
});

test("character sheet links use desktop and mobile render events", () => {
  const source = read("js/cast-ui.js");
  const start = source.indexOf("async function initializeCharacterSheetLinks");
  const end = source.indexOf("\nasync function initializeHandleKana", start);
  const initializer = source.slice(start, end);

  assert.match(initializer, /tnx:mobile-cast-rendered/);
  assert.match(initializer, /tnx:cast-rendered/);
  assert.match(initializer, /once: true/);
  assert.doesNotMatch(initializer, /MutationObserver/);
});

test("mobile cast announces completion after its DOM is rendered", () => {
  const source = read("js/cast-mobile.js");
  assert.match(source, /render\(root,c,s,o,b\);window\.dispatchEvent\(new CustomEvent\(["']tnx:mobile-cast-rendered["']\)\)/);
});
