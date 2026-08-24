import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("responsive rules live with the page that owns their selectors", async () => {
  const [index, archive, account, cast, editor] = await Promise.all([
    read("css-next/index.css"),
    read("css-next/pages/archive.css"),
    read("css-next/pages/account.css"),
    read("css-next/pages/cast.css"),
    read("css-next/editor/editor.css")
  ]);

  assert.doesNotMatch(index, /responsive\.css|tablet\.css/);
  assert.match(archive, /@media \(pointer: coarse\) and \(min-width: 768px\) and \(max-width: 1100px\)/);
  assert.match(archive, /body\[data-page="index\.html"\] \.cast-grid/);
  assert.match(account, /body\[data-page="account\.html"\] \.owned-cast__links/);
  assert.match(cast, /body\[data-page="cast\.html"\] \.cast-header/);
  assert.match(editor, /body\[data-page="sheet\.html"\] \.exp-panel/);
});

test("large touch screens keep desktop structure and enlarge interaction targets", async () => {
  const [cast, editor] = await Promise.all([
    read("css-next/pages/cast.css"),
    read("css-next/editor/editor.css")
  ]);

  for (const css of [cast, editor]) {
    assert.match(css, /@media \(pointer: coarse\) and \(min-width: 1101px\) and \(max-width: 1366px\)/);
    assert.match(css, /min-height: 44px/);
  }
});
