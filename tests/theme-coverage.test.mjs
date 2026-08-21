import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexCss = await readFile(new URL("../css-next/index.css", import.meta.url), "utf8");
const uiTheme = await readFile(new URL("../css-next/tokens/theme-ui-overrides.css", import.meta.url), "utf8");
const mobileTheme = await readFile(new URL("../css-next/pages/cast-mobile-theme.css", import.meta.url), "utf8");

function rgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map(index => Number.parseInt(value.slice(index, index + 2), 16) / 255);
}
function luminance(hex) {
  const [r, g, b] = rgb(hex).map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

test("theme compatibility layers are loaded", () => {
  assert.match(indexCss, /tokens\/theme-ui-overrides\.css\?v=1/);
  assert.match(indexCss, /pages\/cast-mobile-theme\.css\?v=1/);
});

test("mobile cast theme bridge uses canonical theme surfaces", () => {
  assert.match(uiTheme, /--color-panel:\s*var\(--color-surface\)/);
  assert.match(mobileTheme, /--mobile-cast-soft:\s*color-mix\(in srgb, var\(--color-text\) 4%, transparent\)/);
  assert.match(mobileTheme, /\.mobile-cast-meta > div/);
  assert.match(mobileTheme, /\.mobile-outfit-card/);
});

test("semantic UI colors follow theme accents without changing fixed section colors", () => {
  assert.match(uiTheme, /--color-success:/);
  assert.match(uiTheme, /--color-warning:/);
  assert.match(uiTheme, /--color-feature:/);
  assert.doesNotMatch(uiTheme, /--color-section-/);
  assert.match(uiTheme, /:not\(\[data-theme="japanese-army"\]\)/);
});

test("low contrast theme accents meet normal-text contrast target", () => {
  assert.ok(contrast("#ff4d62", "#0c0708") >= 4.5, "vlad accent contrast");
  assert.ok(contrast("#6ea1ff", "#0d1c31") >= 4.5, "lutetia accent contrast");
  assert.ok(contrast("#f07868", "#21140f") >= 4.5, "buena accent contrast");
});
