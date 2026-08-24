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

test("gaming theme is registry-driven, persistent and loaded through the final theme bundle", async () => {
  const [registry, controller, indexHtml, themeManifest] = await Promise.all([
    read("js/theme-registry.js"),
    read("js/css-next-theme.js"),
    read("index.html"),
    read("css-next/themes/index.css")
  ]);

  assert.match(registry, /id:\s*"spectrum-neon",\s*label:\s*"ネオンサイン"/);
  assert.match(controller, /TNX_THEME_REGISTRY/);
  assert.match(controller, /registry\.themes\.forEach/);
  assert.match(controller, /localStorage\.setItem\(STORAGE_KEY, theme\.id\)/);
  assert.match(indexHtml, /<select id="theme-select" data-theme-select aria-label="表示テーマ"><\/select>/);
  assert.doesNotMatch(indexHtml, /<option value="spectrum-neon"/);
  assert.match(themeManifest, /\.\/spectrum-neon\.css\?v=1/);
  assert.match(indexHtml, /css-next\/themes\/index\.css\?v=1/);
});

test("gaming theme owns seven readable neon colors and a layered spectrum background", async () => {
  const source = await read("css-next/themes/spectrum-neon.css");
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

test("gaming neon effects cover semantic surfaces, controls and navigation", async () => {
  const source = await read("css-next/themes/spectrum-neon.css");

  assert.match(source, /body::before/);
  assert.match(source, /body::after/);
  assert.match(source, /\.site-header, \.auth-header, \.sheet-header, \.showcase-header/);
  assert.match(source, /\[data-theme-surface="panel"\]/);
  assert.match(source, /\[data-theme-surface="card"\]/);
  assert.match(source, /\[data-theme-badge="1"\]/);
  assert.match(source, /\.cast-grid, \.owned-cast-list, \.troop-list/);
  assert.match(source, /nth-child\(7n \+ 7\)/);
  assert.match(source, /\.sheet-section-nav a, \.mobile-sheet-nav a/);
  assert.match(source, /\.troop-primary-action, \.cocofolia-copy-button/);
  assert.match(source, /input:not\(\[type="checkbox"\]\)/);
  assert.match(source, /input\[type="checkbox"\]/);
  assert.match(source, /button\[type="submit"\]/);
  assert.match(source, /input\[type="submit"\]/);
  assert.match(source, /\[data-theme-control="1"\]/);
  assert.match(source, /#neon-sign-control-layer/);
  assert.match(source, /nth-of-type\(7n \+ 7\)/);
  assert.match(source, /table tbody tr/);
  assert.match(source, /table :is\(th, td\)/);
  assert.match(source, /::-webkit-scrollbar-thumb/);
  assert.match(source, /spectrum-neon-ambient/);
  assert.match(source, /spectrum-neon-rail/);
  assert.match(source, /prefers-reduced-motion:\s*reduce/);
});

test("native, link-style and dynamically inserted UI share one semantic scope contract", async () => {
  const scope = await read("js/theme-scope.js");

  for (const marker of [
    'attribute: "themeSurface"', 'value: "panel"', 'value: "card"',
    'attribute: "themeBadge"', 'attribute: "themeControl"',
    "button", "input[type='submit']", ".section-toggle", "a.app-back-link",
    ".owned-cast__management a", ".troop-sheet__actions a",
    ".cast-troop-dialog__toolbar a", ".sheet-section-nav a",
    ".mobile-cast-topbar a", ".mobile-sheet-actions a",
    ".mobile-transfer-actions a", ".error-terminal a", "MutationObserver", "attributeFilter"
  ]) {
    assert.ok(scope.includes(marker), `theme scope coverage is missing ${marker}`);
  }
  assert.match(scope, /node\.dataset\[rule\.attribute\]\s*=\s*rule\.value/);
  assert.match(scope, /normalize\(node\)/);
});

test("all active CSS-next screens load the registry and one final theme bundle", async () => {
  for (const page of activeThemePages) {
    const html = await read(page);
    assert.match(html, /theme-registry\.js\?v=1/, `${page} needs the canonical theme registry`);
    assert.match(html, /css-next-theme\.js\?v=8/, `${page} needs the current theme controller`);
    assert.match(html, /theme-scope\.js\?v=1/, `${page} needs semantic theme scopes`);
    const head = html.match(/<head>[\s\S]*?<\/head>/i)?.[0] || "";
    const stylesheets = [...head.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi)]
      .map(match => match[1]);
    assert.equal(stylesheets.length, 2, `${page} must load one application entry and one theme bundle`);
    assert.match(stylesheets[0], /^\.\/css-next\/pages\/[a-z0-9-]+-entry\.css\?v=\d+$/, `${page} needs a page CSS entry`);
    const entry = await read(stylesheets[0].replace(/^\.\//, "").split("?")[0]);
    assert.match(entry, /index\.css\?v=64/, `${page} page entry must include the current base stylesheet`);
    assert.equal(
      stylesheets.at(-1),
      "./css-next/themes/index.css?v=1",
      `${page} must load the theme bundle after every page stylesheet`
    );
    assert.equal(
      stylesheets.filter(href => href === "./css-next/themes/index.css?v=1").length,
      1,
      `${page} must load exactly one theme bundle`
    );
    assert.equal(
      stylesheets.some(href => href.includes("spectrum-neon.css")),
      false,
      `${page} must not link an individual theme`
    );
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
