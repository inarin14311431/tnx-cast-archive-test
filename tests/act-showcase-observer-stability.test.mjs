import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("NeoTokyo decoration observers only react to structural/text mutations", async () => {
  const [story, writing, supporting] = await Promise.all([
    read("js/act-showcase-story-flow.js"),
    read("js/act-showcase-writing-patterns.js"),
    read("js/act-showcase-supporting-cast.js")
  ]);

  assert.match(story, /observer\.observe\(intro, \{ childList: true, subtree: true \}\)/);
  assert.match(writing, /observer\.observe\(intro, \{ childList: true, subtree: true \}\)/);
  assert.match(supporting, /observer\.observe\(document\.body, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(story, /attributes:\s*true/);
  assert.doesNotMatch(writing, /attributes:\s*true/);
  assert.doesNotMatch(supporting, /attributes:\s*true/);
});

test("observer-owned DOM writes are idempotent and cannot retrigger forever", async () => {
  const [story, writing, supporting] = await Promise.all([
    read("js/act-showcase-story-flow.js"),
    read("js/act-showcase-writing-patterns.js"),
    read("js/act-showcase-supporting-cast.js")
  ]);

  assert.match(story, /classList\.toggle\("is-role-primary", primary\)/);
  assert.match(story, /classList\.toggle\("is-role-duplicate", duplicate\)/);
  assert.match(writing, /value && route\.textContent !== value/);
  assert.match(supporting, /function setTextIfChanged/);
  assert.match(supporting, /target\.textContent !== next/);
  assert.match(supporting, /setTextIfChanged\(slot, role\)/);
  assert.match(supporting, /setTextIfChanged\(roleLabel, role\)/);
  assert.match(supporting, /setTextIfChanged\(vectorRole, role\)/);
});

test("public showcase cache keys force browsers onto the stable observer scripts", async () => {
  const html = await read("act-showcase.html");
  assert.match(html, /act-showcase-story-flow\.js\?v=20260908b/);
  assert.match(html, /act-showcase-writing-patterns\.js\?v=20260908b/);
  assert.match(html, /act-showcase-supporting-cast\.js\?v=3/);
});
