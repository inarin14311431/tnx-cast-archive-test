import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const activeThemePages = [
  "404.html", "account.html", "acts.html", "backup.html", "cast.html", "combos.html",
  "index.html", "login.html", "manual-data-import.html", "mobile-transfer.html",
  "password-reset.html", "register.html", "sheet-mobile-new.html", "sheet-mobile.html",
  "sheet.html", "showcase-generator.html", "statistics.html", "transfer.html",
  "troop.html", "troops.html"
];

const relativeLuminance = hex => {
  const channels = hex.slice(1).match(/.{2}/g).map(value => parseInt(value, 16) / 255);
  const linear = channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
};

const contrastRatio = (foreground, background) => {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
};

test("gaming theme is selectable, persistent and loaded through the canonical theme entry", async () => {
  const [controller, indexHtml, indexCss] = await Promise.all([
    read("js/css-next-theme.js"),
    read("index.html"),
    read("css-next/index.css")
  ]);

  assert.match(controller, /"spectrum-neon"/);
  assert.match(controller, /\["spectrum-neon","ゲーミングカラー（仮称）"\]/);
  assert.match(controller, /localStorage\.setItem\(STORAGE_KEY,next\)/);
  assert.match(indexHtml, /<option value="spectrum-neon">ゲーミングカラー（仮称）<\/option>/);
  assert.match(indexCss, /tokens\/spectrum-neon-theme\.css\?v=1/);
});

test("gaming theme owns seven readable neon colors and a layered spectrum background", async () => {
  const source = await read("css-next/tokens/spectrum-neon-theme.css");
  const block = source.match(/:root\[data-theme="spectrum-neon"\]\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const surface = block.match(/--color-surface:\s*(#[0-9a-f]{6})/i)?.[1];
  const tokens = ["red", "orange", "yellow", "green", "cyan", "blue", "violet"];

  assert.equal(tokens.length, 7);
  assert.ok(surface);
  for (const token of tokens) {
    const color = block.match(new RegExp(`--neon-${token}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
    assert.ok(color, `missing neon color ${token}`);
    assert.ok(contrastRatio(color, surface) >= 4.5, `${token} must remain readable on the gaming surface`);
  }
  assert.match(block, /--neon-spectrum:\s*linear-gradient/);
  assert.equal((block.match(/radial-gradient\(/g) || []).length, 7);
});

test("gaming neon effects cover chrome, panels, cards, controls, desktop and mobile navigation", async () => {
  const source = await read("css-next/tokens/spectrum-neon-theme.css");

  assert.match(source, /\.site-header, \.auth-header, \.sheet-header, \.showcase-header/);
  assert.match(source, /\.archive-controls, \.account-panel, \.sheet-section, \.data-panel/);
  assert.match(source, /\.cast-grid, \.owned-cast-list, \.troop-list/);
  assert.match(source, /nth-child\(7n \+ 7\)/);
  assert.match(source, /\.cast-card, \.owned-cast, \.troop-card/);
  assert.match(source, /\.sheet-section-nav a, \.mobile-sheet-nav a/);
  assert.match(source, /\.troop-primary-action, \.cocofolia-copy-button/);
  assert.match(source, /prefers-reduced-motion:\s*reduce/);
});

test("all active CSS-next screens receive refreshed theme assets while fixed and standalone screens stay explicit", async () => {
  for (const page of activeThemePages) {
    const html = await read(page);
    assert.match(html, /css-next-theme\.js\?v=5/, `${page} needs the current theme controller`);
    assert.match(html, /css-next\/index\.css\?v=59/, `${page} needs the current theme stylesheet`);
  }

  const [statistics, showcase, redirect] = await Promise.all([
    read("statistics.html"),
    read("act-showcase.html"),
    read("edit.html")
  ]);
  assert.match(statistics, /data-theme-override="statistics-bureau"/);
  assert.doesNotMatch(showcase, /css-next-theme\.js/);
  assert.doesNotMatch(redirect, /css-next-theme\.js/);
});
