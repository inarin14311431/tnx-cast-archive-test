import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../js/cast-sns-card.js", import.meta.url), "utf8");

// The card's background ends in a dark purple. That is right for the dark themes, but on a light theme it made the
// bottom-right corner dark under the light theme's own (dark / muted) text colours: the ID, the footer and the long
// phrase disappeared. Light themes end on their own surface colour; every other theme keeps the purple.
function backgroundEndFor(theme) {
  const line = source.match(/const backgroundEnd = (.*);/)[1];
  return vm.runInNewContext(line, { theme });
}

test("light themes end the background on their surface colour", () => {
  assert.equal(backgroundEndFor({ colorScheme: "light", surface: "#ffffff" }), "#ffffff");
  assert.equal(backgroundEndFor({ colorScheme: "light", surface: "#f8fbfc", surfaceAlt: "#dce7eb" }), "#f8fbfc");
});

test("dark themes, fallback themes and missing tokens keep the original purple", () => {
  assert.equal(backgroundEndFor({ colorScheme: "dark", surface: "#081218" }), "#24152f");
  assert.equal(backgroundEndFor({ surface: "#0b1424" }), "#24152f"); // FALLBACK_THEMES have no colorScheme
  assert.equal(backgroundEndFor({ colorScheme: "light" }), "#24152f");
});

test("the theme tokens carry the registry's colour scheme into the card, and the gradient uses backgroundEnd", () => {
  assert.match(source, /colorScheme: definition\?\.colorScheme,/);
  assert.match(source, /<stop offset="1" stop-color="\$\{backgroundEnd\}"\/><\/linearGradient>/);
  assert.equal(source.match(/#24152f/g).length, 1); // only as the dark default
});
