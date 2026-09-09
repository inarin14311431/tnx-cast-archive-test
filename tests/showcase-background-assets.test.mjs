import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const presetModule = await readFile(new URL("../js/showcase-background-presets.js", import.meta.url), "utf8");
const fileNames = [...presetModule.matchAll(/url:\s*assetUrl\("([^"]+\.svg)"\)/g)].map(match => match[1]);

test("all bundled ACT SHOWCASE background presets point to valid passive SVG assets", async () => {
  assert.equal(fileNames.length, 7);
  assert.equal(new Set(fileNames).size, 7);

  for (const fileName of fileNames) {
    const source = await readFile(new URL(`../assets/showcase/backgrounds/${fileName}`, import.meta.url), "utf8");
    assert.match(source, /^<svg\b/i, `${fileName} must start with an SVG root`);
    assert.match(source, /<\/svg>\s*$/i, `${fileName} must close its SVG root`);
    assert.doesNotMatch(source, /<script\b/i, `${fileName} must remain passive artwork`);
    assert.doesNotMatch(source, /data:image\/[a-z0-9.+-]+;base64,/i, `${fileName} must not hide a nested raster payload inside SVG`);
  }
});

test("preset URLs remain deployment-relative instead of hard-coding a Pages base path", () => {
  assert.match(presetModule, /new URL\("\.\.\/assets\/showcase\/backgrounds\/", import\.meta\.url\)/);
  assert.doesNotMatch(presetModule, /tnx-cast-archive-test\/assets\/showcase\/backgrounds/);
});

test("legacy 木更津湖 preset identifiers remain readable without being emitted as the current preset", () => {
  assert.match(presetModule, /LEGACY_PRESET_KEY_ALIASES/);
  assert.match(presetModule, /kisarazu-lake-harbor/);
  const currentPresetBlock = presetModule.slice(presetModule.indexOf("SHOWCASE_BACKGROUND_PRESETS"), presetModule.indexOf("LEGACY_PRESET_KEY_ALIASES"));
  assert.doesNotMatch(currentPresetBlock, /key:\s*"neotokyo-bay"/);
});
