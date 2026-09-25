import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

for (const [path, initializer] of [
  ["js/cast-archetype-view.js", "enhanceBase"],
  ["js/cast-compact-skills.js", "finalize"],
  ["js/cast-style-skills.js", "whenCastReady"],
  ["js/cast-outfits.js", "waitForCastReady"]
]) {
  test(`${path} uses the cast render event without a hidden-state observer`, () => {
    const source = read(path);
    assert.match(source, /tnx:cast-rendered/);
    assert.doesNotMatch(source, /new MutationObserver/);
    assert.doesNotMatch(source, /attributeFilter: \["hidden"\]/);
    assert.match(source, new RegExp(initializer));
  });
}
