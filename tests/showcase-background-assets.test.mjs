import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const presetModule = await readFile(new URL("../js/showcase-background-presets.js", import.meta.url), "utf8");
const fileNames = [...presetModule.matchAll(/url:\s*assetUrl\("([^"]+\.svg)"\)/g)].map(match => match[1]);

function assertSelfContainedAvifSvg(source, fileName) {
  assert.match(source, /^<svg\b/i, `${fileName} must start with an SVG root`);
  assert.match(source, /<\/svg>\s*$/i, `${fileName} must close its SVG root`);
  assert.doesNotMatch(source, /<script\b/i, `${fileName} must remain passive artwork`);
  assert.doesNotMatch(source, /<foreignObject\b/i, `${fileName} must not embed active foreign content`);
  assert.doesNotMatch(source, /\son[a-z]+\s*=/i, `${fileName} must not declare event handlers`);

  const imageMatches = [...source.matchAll(/<image\b[^>]*\bhref="data:image\/avif;base64,([^"]+)"[^>]*>/gi)];
  assert.equal(imageMatches.length, 1, `${fileName} must embed exactly one AVIF background image`);
  assert.doesNotMatch(
    source,
    /\b(?:href|xlink:href)="(?!data:image\/avif;base64,)[^"]+"/i,
    `${fileName} must not reference external resources`
  );

  const payload = Buffer.from(imageMatches[0][1], "base64");
  assert.ok(payload.length > 16, `${fileName} must contain a non-empty AVIF payload`);
  assert.equal(payload.subarray(4, 8).toString("ascii"), "ftyp", `${fileName} must contain an ISO-BMFF file type box`);
  assert.equal(payload.subarray(8, 12).toString("ascii"), "avif", `${fileName} must contain a real AVIF payload`);
}

test("all bundled ACT SHOWCASE background presets point to valid passive self-contained AVIF SVG assets", async () => {
  assert.equal(fileNames.length, 7);
  assert.equal(new Set(fileNames).size, 7);

  for (const fileName of fileNames) {
    const source = await readFile(new URL(`../assets/showcase/backgrounds/${fileName}`, import.meta.url), "utf8");
    assertSelfContainedAvifSvg(source, fileName);
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
