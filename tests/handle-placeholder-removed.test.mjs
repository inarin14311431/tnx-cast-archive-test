import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { formatHandle } from "../js/cast-display-format.js";
import { createQuickPageHeader, createQuickSheetHtml } from "../js/cast-quick-sheet-html.js";
import { formatShowcaseHandle } from "../js/showcase-display-format.js";
import { character, outfits, skills, combos, usageEntries } from "./fixtures/output-rendering.mjs";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("formatHandle returns an empty string for a missing handle, like the showcase output", () => {
  for (const empty of [undefined, null, "", "  ", "“”", "「」"]) {
    assert.equal(formatHandle(empty), "", JSON.stringify(empty));
    assert.equal(formatShowcaseHandle(empty), "", JSON.stringify(empty));
  }
  assert.equal(formatHandle("灯"), "“灯”");
  assert.equal(formatHandle("““灯””"), "“灯”");
});

test("quick sheet page header joins only the parts that exist", () => {
  const named = { ...character, public_id: "TNX-X", character_name: "名前" };
  assert.match(createQuickPageHeader({ ...named, handle: "" }, 1), /<p>名前<\/p>/);
  assert.match(createQuickPageHeader({ ...named, handle: "灯" }, 1), /<p>“灯” 名前<\/p>/);
  assert.match(createQuickPageHeader({ ...named, handle: "", character_name: "" }, 1), /<p>NO NAME<\/p>/);
  assert.doesNotMatch(createQuickPageHeader({ ...named, handle: "" }, 1), /NO HANDLE|<p> /);
});

test("quick sheet identity keeps the handle element but empties and hides it when there is no handle", () => {
  const render = handle => createQuickSheetHtml({ character: { ...character, handle }, skills, outfits, combos }, new Map(usageEntries));
  const without = render("");
  assert.match(without, /<span aria-hidden="true"><\/span>\s*<h1>/);
  assert.doesNotMatch(without, /NO HANDLE/);
  const withHandle = render("灯");
  assert.match(withHandle, /<span>“灯”<\/span>\s*<h1>/);
  assert.doesNotMatch(withHandle, /aria-hidden="true"><\/span>\s*<h1>/);
});

test("list and pick cards no longer fall back to placeholder text and keep an aria-hidden empty row", async () => {
  for (const [file, className] of [
    ["js/archive.js", "cast-card__handle"],
    ["js/account.js", "owned-cast__handle"],
    ["js/showcase-generator-v3.js", "cast-pick-card__handle"]
  ]) {
    const source = await read(file);
    assert.doesNotMatch(source, /NO HANDLE|ハンドル未登録/, `${file} still has a placeholder`);
    assert.match(source, new RegExp(`class="${className}"\\$\\{handle \\? "" : ' aria-hidden="true"'\\}>\\$\\{escapeHtml\\(handle\\)\\}`), file);
  }
});

test("legacy placeholder values stay recognized as 'no handle' in the data-compat layer", async () => {
  const source = await read("js/handle-format.js");
  assert.match(source, /PLACEHOLDERS=new Set\(\["","—","-","NO HANDLE","ハンドル未登録"\]\)/);
});

test("each handle row reserves one line so the name stays at the same height with or without a handle", async () => {
  for (const [file, selector] of [
    ["css-next/pages/archive.css", /\.cast-card__handle \{[^}]*min-height: 1lh;/],
    ["css-next/pages/account-actions.css", /\.owned-cast__handle \{[^}]*min-height: 1lh;/],
    ["css-next/pages/showcase.css", /\.cast-pick-card__handle \{[^}]*min-height: 1lh;/],
    ["css-next/pages/cast.css", /\.quick-sheet__identity-name > span \{[^}]*min-height: 1lh;/]
  ]) assert.match(await read(file), selector, file);
});
