import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [entryCss, caretCss] = await Promise.all([
  read("css-next/pages/act-showcase-entry.css"),
  read("css-next/pages/act-showcase-trailer-caret-fix.css")
]);

test("ACT TRAILER uses one thin caret instead of a combined block glyph", () => {
  assert.match(entryCss.trim().split("\n").at(-1), /act-showcase-trailer-caret-fix\.css\?v=/);
  assert.match(caretCss, /content:""/);
  assert.match(caretCss, /width:2px/);
  assert.match(caretCss, /height:1\.05em/);
  assert.match(caretCss, /background:var\(--showcase-primary\)/);
  assert.match(caretCss, /font-size:0/);
  assert.doesNotMatch(caretCss, /[▋█▌]/);
});
