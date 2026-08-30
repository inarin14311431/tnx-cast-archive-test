import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const archive = await readFile(new URL("../js/archive.js", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("archive cards show the canonical public archive ID without re-masking it", () => {
  assert.match(archive, /const displayId = String\(character\.public_id \?\? ""\)\.trim\(\) \|\| "TNX-UNKNOWN";/);
  assert.doesNotMatch(archive, /obfuscatePublicId/);
  assert.match(archive, /<p class="cast-card__serial">\$\{escapeHtml\(displayId\)\}<\/p>/);
});

test("archive search uses the same canonical public ID and the page loads the updated module", () => {
  assert.match(archive, /character\.public_id, character\.character_name/);
  assert.match(index, /\.\/js\/archive\.js\?v=49/);
});
