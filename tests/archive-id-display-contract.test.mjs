import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const archive = await readFile(new URL("../js/archive.js", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const cast = await readFile(new URL("../cast.html", import.meta.url), "utf8");
const listDisplay = await readFile(new URL("../js/archive-id-list-display.js", import.meta.url), "utf8");
const castDisplay = await readFile(new URL("../js/archive-id-cast-display.js", import.meta.url), "utf8");
const cyberScan = await readFile(new URL("../js/cast-cyberscan.js", import.meta.url), "utf8");

test("archive cards keep the canonical public ID internal and replace only its visible label", () => {
  assert.match(archive, /const displayId = String\(character\.public_id \?\? ""\)\.trim\(\) \|\| "TNX-UNKNOWN";/);
  assert.match(listDisplay, /window\.TNXArchiveId\?\.format/);
  assert.match(listDisplay, /\.cast-card__serial/);
  assert.doesNotMatch(archive, /obfuscatePublicId/);
});

test("archive and cast pages load the shared display-code formatter before their adapters", () => {
  assert.match(index, /archive-id-code\.js\?v=1[\s\S]*archive-id-list-display\.js\?v=1[\s\S]*archive\.js\?v=49/);
  assert.match(cast, /archive-id-code\.js\?v=1[\s\S]*archive-id-cast-display\.js\?v=1[\s\S]*cast-cyberscan\.js\?v=75/);
});

test("cast detail and scan presentation hide the raw route ID without changing lookup semantics", () => {
  assert.match(castDisplay, /const rawId = new URLSearchParams\(location\.search\)\.get\("id"\)/);
  assert.match(castDisplay, /#cast-public-id/);
  assert.match(castDisplay, /\.mobile-cast-topbar > span/);
  assert.match(cyberScan, /const displayId=window\.TNXArchiveId\?\.format\(publicId\)/);
  assert.match(cyberScan, /TARGET: \$\{escapeHtml\(displayId\)\}/);
});
