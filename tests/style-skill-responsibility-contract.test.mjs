import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const styleSkills = await readFile(new URL("../css-next/editor/style-skills.css", import.meta.url), "utf8");
const separators = await readFile(new URL("../css-next/editor/style-separators.css", import.meta.url), "utf8");
const fields = await readFile(new URL("../js/style-skill-fields.js", import.meta.url), "utf8");
const integrity = await readFile(new URL("../js/style-skill-detail-integrity.js", import.meta.url), "utf8");
const masterSearch = await readFile(new URL("../js/sheet-master-search.js", import.meta.url), "utf8");

test("separator presentation has one CSS owner", () => {
  assert.doesNotMatch(styleSkills, /#style-skills[^\n{]*\.style-skill-separator-row/);
  assert.match(separators, /\.style-skill-separator-row/);
  assert.match(separators, /\[data-f="name"\]:hover/);
  assert.match(separators, /\[data-f="name"\]:focus/);
});

test("style detail DOM readiness is owned by style-skill-fields", () => {
  assert.match(fields, /function\s+waitUntilReady\s*\(/);
  assert.match(fields, /tnx:style-skill-detail-ready/);
  assert.match(fields, /TNXStyleSkillFields=\{enhance,isReady,waitUntilReady,/);
  assert.match(masterSearch, /TNXStyleSkillFields\?\.waitUntilReady\?\.\(row,\s*1600\)/);
  assert.doesNotMatch(masterSearch, /querySelectorAll\("\[data-style-field\]"\)[\s\S]{0,180}fields\.length\s*>=\s*9/);
});

test("integrity layer consumes detail readiness without owning DOM observation", () => {
  assert.doesNotMatch(integrity, /new\s+MutationObserver\s*\(/);
  assert.match(integrity, /TNXStyleSkillFields\?\.enhance\?\.\(\)/);
  assert.match(integrity, /const\s+queue\s*=\s*\(\)\s*=>/);
  assert.match(integrity, /requestAnimationFrame\s*\(/);
  assert.match(integrity, /addEventListener\(STYLE_SKILLS_CHANGED_EVENT,\s*queue\)/);
});
