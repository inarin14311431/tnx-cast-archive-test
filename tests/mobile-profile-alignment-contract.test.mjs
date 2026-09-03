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

test("mobile cast view adds bilingual profile labels, tagline and Character Sheets link", async () => {
  const source = await read("js/cast-mobile-level-labels.js");
  assert.match(source, /\["プレイヤー",\s*"PLAYER"\]/);
  assert.match(source, /makeSubheading\("一言",\s*"TAGLINE"/);
  assert.match(source, /makeSubheading\("キャラクターシート倉庫",\s*"CHARACTER SHEETS"/);
  assert.match(source, /character\.character_sheet_url/);
  assert.match(source, /normalizeCharacterSheetUrl\(character\.character_sheet_url\)/);
  assert.match(source, /makeSubheading\("背景設定",\s*"BACKGROUND"/);
});

test("mobile profile CSS preserves a two-line tagline editor and bilingual subtitles", async () => {
  const editorCss = await read("css-next/pages/sheet-mobile-profile.css");
  const viewCss = await read("css-next/pages/cast-mobile-readability.css");
  assert.match(editorCss, /textarea\[data-mobile-profile-modal-field="summary"\]\{min-height:72px;height:72px/);
  assert.match(editorCss, /\.mobile-profile-en\{/);
  assert.match(viewCss, /\.mobile-cast-source-link/);
  assert.match(viewCss, /\.mobile-cast-profile-subheading/);
});