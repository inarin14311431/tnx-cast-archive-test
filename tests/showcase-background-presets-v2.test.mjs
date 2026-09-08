import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

const expectedPresets = [
  ["nova-central-ring", "トーキョーN◎VA", "nova-central-ring.svg"],
  ["neotokyo-bay", "木更津湖港湾", "neotokyo-bay.svg"],
  ["sunrise-megacity", "夜明けのメガシティ", "sunrise-megacity.svg"],
  ["neon-market", "イエローエリア", "neon-market.svg"],
  ["industrial-port", "工業港湾地区", "industrial-port.svg"],
  ["executive-lounge", "ホワイトエリア", "executive-lounge.svg"],
  ["incident-blockade", "封鎖区域", "incident-blockade.svg"]
];

test("act showcase exposes exactly seven replacement background presets", async () => {
  const source = await read("js/showcase-background-presets.js");
  const presetCount = [...source.matchAll(/Object\.freeze\(\{\s*key:/g)].length;
  assert.equal(presetCount, 7);
  assert.match(source, /new URL\("\.\.\/assets\/showcase\/backgrounds\/", import\.meta\.url\)/);

  for (const [key, name, filename] of expectedPresets) {
    assert.ok(source.includes(`key: "${key}"`), `missing preset key: ${key}`);
    assert.ok(source.includes(`name: "${name}"`), `missing preset name: ${name}`);
    assert.ok(source.includes(`assetUrl("${filename}")`), `missing preset asset: ${filename}`);
  }

  for (const retired of ["ネオン・ウォーターフロント", "アーコロジー・ロビー", "レッドエリア裏路地", "スカイラウンジ", "ニューロ・データスペース"]) {
    assert.ok(!source.includes(retired), `retired preset remains: ${retired}`);
  }
});

test("all seven showcase background assets are self-contained image files", async () => {
  for (const [, , filename] of expectedPresets) {
    const asset = await read(`assets/showcase/backgrounds/${filename}`);
    assert.match(asset, /^<svg\b/);
    assert.match(asset, /data:image\/webp;base64,/);
  }
});

test("generator loads the refreshed preset picker and no longer labels presets as Supabase-only", async () => {
  const html = await read("showcase-generator.html");
  const picker = await read("js/showcase-background-preset-picker.js");
  assert.match(html, /showcase-background-preset-picker\.js\?v=2/);
  assert.match(html, /ACT VISUAL \/ PRESET LIBRARY/);
  assert.ok(!html.includes("ACT VISUAL / SUPABASE STORAGE"));
  assert.match(picker, /showcase-background-presets\.js\?v=2/);
});
