import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("NeoTokyo decoration observers only react to structural mutations", async () => {
  const [story, writing, supporting, visual, board] = await Promise.all([
    read("js/act-showcase-story-flow.js"),
    read("js/act-showcase-writing-patterns.js"),
    read("js/act-showcase-supporting-cast.js"),
    read("js/act-showcase-visual-caption-code.js"),
    read("js/act-showcase-board-layout.js")
  ]);

  assert.match(story, /observer\.observe\(intro, \{ childList: true, subtree: true \}\)/);
  assert.match(writing, /observer\.observe\(intro, \{ childList: true, subtree: true \}\)/);
  assert.match(supporting, /observer\.observe\(document\.body, \{ childList: true, subtree: true \}\)/);
  assert.match(visual, /observer\.observe\(story, \{ childList: true, subtree: true \}\)/);
  assert.match(board, /observer\.observe\(story, \{ childList: true, subtree: true \}\)/);
  assert.match(board, /observer\.observe\(intro, \{ childList: true, subtree: true \}\)/);
  for (const source of [story, writing, supporting, visual, board]) {
    assert.doesNotMatch(source, /attributes:\s*true/);
  }
});

test("observer-owned DOM writes are idempotent and cannot retrigger forever", async () => {
  const [story, writing, supporting, visual, board] = await Promise.all([
    read("js/act-showcase-story-flow.js"),
    read("js/act-showcase-writing-patterns.js"),
    read("js/act-showcase-supporting-cast.js"),
    read("js/act-showcase-visual-caption-code.js"),
    read("js/act-showcase-board-layout.js")
  ]);

  assert.match(story, /classList\.toggle\("is-role-primary", primary\)/);
  assert.match(story, /classList\.toggle\("is-role-duplicate", duplicate\)/);
  assert.match(writing, /value && route\.textContent !== value/);
  assert.match(supporting, /function setTextIfChanged/);
  assert.match(supporting, /target\.textContent !== next/);
  assert.match(supporting, /setTextIfChanged\(slot, role\)/);
  assert.match(supporting, /setTextIfChanged\(roleLabel, role\)/);
  assert.match(supporting, /setTextIfChanged\(vectorRole, role\)/);
  assert.match(visual, /span\.textContent !== visualMeta/);
  assert.match(visual, /strong\.textContent !== code/);
  assert.match(board, /const setTextIfChanged/);
  assert.match(board, /target\.textContent !== next/);
  assert.match(board, /setTextIfChanged\(bar\.querySelector\("\.poster-v2-act-meta__title"\), actTitle\)/);
  assert.match(board, /if \(queued\) return/);
});

test("public showcase cache keys force browsers onto every stable observer script", async () => {
  const html = await read("act-showcase.html");
  assert.match(html, /act-showcase-board-layout\.js\?v=20260908b/);
  assert.match(html, /act-showcase-story-flow\.js\?v=20260908b/);
  assert.match(html, /act-showcase-writing-patterns\.js\?v=20260908b/);
  assert.match(html, /act-showcase-visual-caption-code\.js\?v=3/);
  assert.match(html, /act-showcase-supporting-cast\.js\?v=3/);
});
