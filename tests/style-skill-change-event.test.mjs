import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fields = await readFile(new URL("../js/style-skill-fields.js", import.meta.url), "utf8");
const features = await readFile(new URL("../js/sheet-features.js", import.meta.url), "utf8");
const integrity = await readFile(new URL("../js/style-skill-detail-integrity.js", import.meta.url), "utf8");

test("style skill fields publish the canonical change event", () => {
  assert.match(fields, /STYLE_SKILLS_CHANGED_EVENT="tnx:style-skills-changed"/);
  assert.match(fields, /dispatchEvent\(new CustomEvent\(STYLE_SKILLS_CHANGED_EVENT/);
});

test("sheet features no longer owns raw style-skill input events", () => {
  assert.doesNotMatch(features, /styleRoot\.addEventListener\(["']input["']/);
  assert.match(features, /styleRoot\.addEventListener\(["']tnx:style-skills-changed["'],queue\)/);
});

test("style skill integrity follows the canonical change event instead of raw input", () => {
  assert.match(integrity, /STYLE_SKILLS_CHANGED_EVENT\s*=\s*["']tnx:style-skills-changed["']/);
  assert.doesNotMatch(integrity, /root\.addEventListener\(["']input["']/);
  assert.match(integrity, /root\.addEventListener\(STYLE_SKILLS_CHANGED_EVENT, queue\)/);
});
