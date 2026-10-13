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

// The labels inside the always-dark portrait frame must not take the light themes' near-black text / accent colours.
function portraitLabelColours(theme) {
  const text = source.match(/const portraitLabelText = (.*);/)[1];
  const accent = source.match(/const portraitLabelAccent = (.*);/)[1];
  return { text: vm.runInNewContext(text, { theme }), accent: vm.runInNewContext(accent, { theme }) };
}

function contrast(foreground, background) {
  const luminance = hex => {
    const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
      .map(value => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

test("light themes use light labels inside the dark portrait frame", () => {
  const light = portraitLabelColours({ colorScheme: "light", text: "#111111", accent: "#111111" });
  assert.ok(contrast(light.text, "#0a1321") >= 7);
  assert.ok(contrast(light.accent, "#0a1321") >= 7);
});

test("dark and fallback themes keep their own text and accent colours in the portrait frame", () => {
  assert.deepEqual(portraitLabelColours({ colorScheme: "dark", text: "#effcff", accent: "#67efff" }), { text: "#effcff", accent: "#67efff" });
  assert.deepEqual(portraitLabelColours({ text: "#ffffff", accent: "#00d8ff" }), { text: "#ffffff", accent: "#00d8ff" });
});

test("the two portrait labels are drawn with the portrait label colours", () => {
  assert.match(source, /fill="\$\{portraitLabelText\}"[^>]*>VISUAL IDENTITY \/\/ VERIFIED</);
  assert.match(source, /fill="\$\{portraitLabelAccent\}"[^>]*>LIVE IMAGE LINK : OK</);
});
