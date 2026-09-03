import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile editor exposes Character Sheets URL and uses 一言 / TAGLINE", async () => {
  const source = await read("js/sheet-mobile-profile.js");
  assert.match(source, /source:\s*\{\s*title:\s*"キャラクターシート倉庫",\s*english:\s*"CHARACTER SHEETS"/);
  assert.match(source, /\["character_sheet_url",\s*"URL",\s*"url",\s*"CHARACTER SHEETS URL"\]/);
  assert.match(source, /summary:\s*\{\s*title:\s*"一言",\s*english:\s*"TAGLINE"/);
  assert.match(source, /profile:\s*\{\s*title:\s*"背景設定",\s*english:\s*"BACKGROUND"/);
  assert.doesNotMatch(source, /summary:\s*\{\s*title:\s*"概要"/);
});

test("mobile editor keeps URL on the existing character_sheet_url field", async () => {
  const editor = await read("js/sheet-mobile.js");
  const profile = await read("js/sheet-mobile-profile.js");
  assert.match(editor, /"character_sheet_url"/);
  assert.match(editor, /normalizeCharacterSheetUrl\(payload\.character_sheet_url\)/);
  assert.match(profile, /data-mobile-profile-modal-field="\$\{field\}"/);
});

test("mobile cast view adds bilingual profile labels, tagline and linked Character Sheets heading", async () => {
  const source = await read("js/cast-mobile-level-labels.js");
  assert.match(source, /\["プレイヤー",\s*"PLAYER"\]/);
  assert.match(source, /makeSubheading\("一言",\s*"TAGLINE"/);
  assert.match(source, /function makeSourceHeading\(href\)/);
  assert.match(source, /strong\.textContent = "キャラクターシート倉庫を開く"/);
  assert.match(source, /small\.textContent = "OPEN CHARACTER SHEETS"/);
  assert.match(source, /link\.href = href/);
  assert.match(source, /character\.character_sheet_url/);
  assert.match(source, /normalizeCharacterSheetUrl\(character\.character_sheet_url\)/);
  assert.match(source, /makeSubheading\("背景設定",\s*"BACKGROUND"/);
  assert.doesNotMatch(source, /倉庫との差分を確認/);
});

test("mobile cast view removes obsolete CHARACTER SHEET metadata row", async () => {
  const source = await read("js/cast-mobile-level-labels.js");
  assert.match(source, /\.mobile-cast-meta > div/);
  assert.match(source, /label === "CHARACTER SHEET" \|\| label === "CHARACTER SHEETS"/);
  assert.match(source, /if \(isCharacterSheetLabel \|\| hasCharacterSheetLink\) row\.remove\(\)/);
});

test("mobile cast view aligns each style and mark directly above its divine work", async () => {
  const source = await read("js/cast-mobile-level-labels.js");
  const viewCss = await read("css-next/pages/cast-mobile-readability.css");
  assert.match(source, /function alignStyleDivineRows\(root\)/);
  assert.match(source, /\.mobile-cast-divines > article/);
  assert.match(source, /styleLabel\.classList\.add\("mobile-cast-divine-style"\)/);
  assert.match(source, /styleLabel\.append\(mark\.cloneNode\(true\)\)/);
  assert.match(source, /styleRow\?\.remove\(\)/);
  assert.match(viewCss, /\.mobile-cast-divines \.mobile-cast-divine-style/);
  assert.match(viewCss, /\.mobile-cast-divines strong \{ display:block;font-size:12px/);
});

test("mobile profile CSS preserves a two-line tagline editor and underlined warehouse section link", async () => {
  const editorCss = await read("css-next/pages/sheet-mobile-profile.css");
  const viewCss = await read("css-next/pages/cast-mobile-readability.css");
  const linkCss = await read("css-next/pages/cast-mobile-character-sheet-link.css");
  assert.match(editorCss, /textarea\[data-mobile-profile-modal-field="summary"\]\{min-height:72px;height:72px/);
  assert.match(editorCss, /\.mobile-profile-en\{/);
  assert.match(viewCss, /\.mobile-cast-source-heading-link/);
  assert.match(viewCss, /\.mobile-cast-profile-subheading/);
  assert.match(linkCss, /\.mobile-cast-source-heading-link/);
  assert.match(linkCss, /text-decoration:\s*underline/);
  assert.doesNotMatch(viewCss, /\.mobile-cast-source-link/);
});
