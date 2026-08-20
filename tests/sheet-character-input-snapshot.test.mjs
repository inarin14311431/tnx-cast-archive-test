import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { collectCharacterInputSnapshot } from "../js/sheet-character-input-snapshot.js";

function fakeRoot(values = {}, texts = {}) {
  return {
    querySelector(selector) {
      if (Object.hasOwn(values, selector)) return { value: values[selector] };
      if (Object.hasOwn(texts, selector)) return { textContent: texts[selector] };
      return null;
    }
  };
}

test("character input snapshot preserves base and structured field mappings", () => {
  const snapshot = collectCharacterInputSnapshot({
    root: fakeRoot({
      "#character-name": "テストキャスト",
      "#character-kana": "テスト",
      "#handle": "HANDLE",
      "#player-name": "PLAYER",
      "#affiliation": "千早重工",
      "#citizen-rank": "B",
      "#summary": "summary",
      "#profile": "profile",
      "#visibility": "public",
      "#age": "24",
      "#gender": "X"
    }),
    structuredFields: [["age", "#age"], ["gender", "#gender"]],
    experienceTotal: 18
  });

  assert.deepEqual(snapshot.base, {
    character_name: "テストキャスト",
    character_kana: "テスト",
    handle: "HANDLE",
    player_name: "PLAYER",
    affiliation: "千早重工",
    citizen_rank: "B",
    summary: "summary",
    profile: "profile",
    visibility: "public",
    experience_points: 18
  });
  assert.deepEqual(snapshot.structured, { age: "24", gender: "X" });
});

test("missing controls fall back to empty strings", () => {
  const snapshot = collectCharacterInputSnapshot({
    root: fakeRoot(),
    structuredFields: [["age", "#age"]],
    experienceTotal: 0
  });
  assert.equal(snapshot.base.character_name, "");
  assert.equal(snapshot.base.experience_points, 0);
  assert.deepEqual(snapshot.structured, { age: "" });
});

test("classic sheet delegates profile DOM collection to snapshot module", async () => {
  const source = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.match(source, /sheet-character-input-snapshot\.js\?v=1/);
  assert.match(source, /collectCharacterInputSnapshot/);
  assert.doesNotMatch(source, /Object\.fromEntries\(STRUCTURED_FIELDS\.map/);
});
