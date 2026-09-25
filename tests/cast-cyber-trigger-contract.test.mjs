import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("cyber effects initialize from cast render and scan-complete events", () => {
  const source = read("js/cast-cyber-trigger.js");
  assert.match(source, /tnx:cast-rendered/);
  assert.match(source, /tnx:cast-scan-complete/);
  assert.match(source, /once:true/);
  assert.match(source, /if\(started\|\|content\.hidden\)return/);
  assert.doesNotMatch(source, /new MutationObserver/);
  assert.doesNotMatch(source, /\.observe\(/);
});

test("cyber effects preserve the existing animation timing contract", () => {
  const source = read("js/cast-cyber-trigger.js");
  for (const delay of [0, 250, 700, 1400, 3200]) {
    assert.match(source, new RegExp(`setTimeout\\(start,${delay}\\)`));
  }
  assert.match(source, /setTimeout\(scan,350\)/);
  assert.match(source, /setInterval\(scan,5600\)/);
  assert.match(source, /--cast-style-delay/);
  assert.match(source, /380\+index\*320/);
});
