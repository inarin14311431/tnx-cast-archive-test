import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceUrl = new URL("../js/sheet-import.js", import.meta.url);

test("legacy personal and lifepath fields map into structured editor controls", async () => {
  const source = await readFile(sourceUrl, "utf8");
  for (const selector of [
    "#age", "#gender", "#height", "#weight", "#eyes", "#hair", "#skin",
    "#life-path-origin", "#life-path-experience", "#life-path-encounter"
  ]) {
    assert.match(source, new RegExp(`setElement\\('${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`));
  }
  assert.match(source, /'#life-path-origin',get\(map,'base\.lifepath\.origin','base\.lifepath\.experience'/);
  assert.match(source, /'#life-path-experience',get\(map,'base\.lifepath\.environment'/);
  assert.match(source, /'#life-path-encounter',get\(map,'base\.lifepath\.encounter','base\.lifepath\.encouter'/);
});

test("legacy star-marked skills become one free level while keeping a clean name", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /function skillFreeLevel\(data\)/);
  assert.match(source, /\^\\s\*★/);
  assert.match(source, /Math\.min\(level,1\)/);
  assert.match(source, /\[data-f=\\"free_level\\"\]/);
  assert.match(source, /cleanName\(data\.name\)/);
});

test("structured personal fields are no longer duplicated into profile text", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const profileStart = source.indexOf("const profileParts=[");
  const profileEnd = source.indexOf("await setElement('#profile'", profileStart);
  assert.ok(profileStart >= 0 && profileEnd > profileStart);
  const profileBlock = source.slice(profileStart, profileEnd);
  assert.match(profileBlock, /base\.memoir/);
  assert.match(profileBlock, /base\.birth/);
  assert.doesNotMatch(profileBlock, /base\.age|base\.sex|base\.height|base\.weight|base\.eyes|base\.hair|base\.skin|base\.lifepath\.environment|base\.lifepath\.encounter/);
});
