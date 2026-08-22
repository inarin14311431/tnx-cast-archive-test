import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("simple guest generator is read-only and derives from existing cast tables", async () => {
  const [html, script, trigger] = await Promise.all([
    read("guest-generator.html"),
    read("js/simple-guest-generator.js"),
    read("js/direct-transfer-button.js")
  ]);

  assert.match(html, /簡易ゲスト化/);
  assert.match(script, /from\("characters"\)/);
  assert.match(script, /from\("character_skills"\)/);
  assert.match(script, /from\("character_outfits"\)/);
  assert.doesNotMatch(script, /\.(insert|update|delete|upsert)\s*\(/);
  assert.match(trigger, /guest-generator\.html\?id=/);
});

test("simple guest generator preserves source values instead of recalculating combat stats", async () => {
  const script = await read("js/simple-guest-generator.js");
  assert.match(script, /数値の再計算・バランス調整はしていません/);
  assert.match(script, /reason_value/);
  assert.match(script, /reason_control/);
  assert.match(script, /defense_s/);
  assert.match(script, /defense_p/);
  assert.match(script, /defense_i/);
});
