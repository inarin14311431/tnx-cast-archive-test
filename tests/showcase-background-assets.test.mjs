import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const presetModule = await readFile(new URL("../js/showcase-background-presets.js", import.meta.url), "utf8");
const fileNames = [...presetModule.matchAll(/makeAssetUrl\("([^"]+\.svg)"\)/g)].map(match => match[1]);

test("all bundled ACT SHOWCASE background presets point to valid SVG assets", async () => {
  assert.equal(fileNames.length, 7);
  assert.equal(new Set(fileNames).size, 7);

  for (const fileName of fileNames) {
    const source = await readFile(new URL(`../assets/showcase/backgrounds/${fileName}`, import.meta.url), "utf8");
    assert.match(source, /^<svg\b/i, `${fileName} must start with an SVG root`);
    assert.match(source, /<\/svg>\s*$/i, `${fileName} must close its SVG root`);
    assert.doesNotMatch(source, /<script\b/i, `${fileName} must remain passive artwork`);

    for (const match of source.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g)) {
      const bytes = Buffer.from(match[1], "base64");
      assert.ok(bytes.length >= 12, `${fileName} embedded WebP must include a RIFF header`);
      assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", `${fileName} embedded WebP RIFF signature is invalid`);
      assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", `${fileName} embedded WebP container signature is invalid`);
    }
  }
});

test("preset URLs remain deployment-relative instead of hard-coding a Pages base path", () => {
  assert.match(presetModule, /new URL\("\.\.\/assets\/showcase\/backgrounds\/", import\.meta\.url\)/);
  assert.doesNotMatch(presetModule, /tnx-cast-archive-test\/assets\/showcase\/backgrounds/);
});
