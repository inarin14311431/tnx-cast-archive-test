import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../css-next/pages/act-showcase-entry.css", import.meta.url), "utf8");
const dedicatedTheme = await readFile(new URL("../css-next/pages/act-showcase-dedicated-themes.css", import.meta.url), "utf8");
const showcaseHtml = await readFile(new URL("../act-showcase.html", import.meta.url), "utf8");

const ids = ["nova", "intron", "vlad", "lutetia"];

test("one dedicated ACT theme layer owns the final cinematic override slot", () => {
  assert.match(entry, /act-showcase-dedicated-themes\.css\?v=1/);
  assert.doesNotMatch(entry, /act-showcase-theme\.css|act-showcase-theme-coverage\.css|act-showcase-cinematic-theme\.css/);
  assert.equal(entry.trim().split("\n").at(-1), '@import "./act-showcase-dedicated-themes.css?v=1";');
  assert.match(showcaseHtml, /act-showcase-entry\.css\?v=12/);
});

test("all four ACT-specific themes own explicit tokens", () => {
  for (const id of ids) {
    assert.match(dedicatedTheme, new RegExp(`:root\\[data-showcase-theme=["']${id}["']\\]`));
  }
  assert.match(dedicatedTheme, /--showcase-theme-name:"NEON GRID"/);
  assert.match(dedicatedTheme, /--showcase-theme-name:"DOSSIER"/);
  assert.match(dedicatedTheme, /--showcase-theme-name:"CRIMSON NOIR"/);
  assert.match(dedicatedTheme, /--showcase-theme-name:"ORBITAL GLASS"/);
});

test("intermediate cinematic sequence is driven by dedicated theme tokens", () => {
  assert.match(dedicatedTheme, /\.neotokyo-sequence__shell/);
  assert.match(dedicatedTheme, /\.neotokyo-sequence__screen--opening\.is-cinematic-access/);
  assert.match(dedicatedTheme, /\.neotokyo-sequence__act-title/);
  assert.match(dedicatedTheme, /\.neotokyo-sequence__trailer-terminal/);
  assert.match(dedicatedTheme, /\.neotokyo-sequence__readout\.is-terminal-readout/);
  assert.match(dedicatedTheme, /\.neotokyo-sequence__handout-panel/);
  assert.match(dedicatedTheme, /\.neotokyo-sequence__assign-frame/);
  assert.match(dedicatedTheme, /\.neotokyo-sequence__cast--linked/);
  assert.match(dedicatedTheme, /var\(--showcase-bg\)/);
  assert.match(dedicatedTheme, /var\(--showcase-surface-rgb\)/);
  assert.match(dedicatedTheme, /var\(--showcase-primary(?:-rgb)?\)/);
  assert.match(dedicatedTheme, /var\(--showcase-secondary(?:-rgb)?\)/);
  assert.match(dedicatedTheme, /var\(--showcase-tertiary(?:-rgb)?\)/);
  assert.match(dedicatedTheme, /var\(--showcase-text\)/);
  assert.match(dedicatedTheme, /var\(--showcase-muted\)/);
});

test("Dossier, Crimson Noir, and Orbital Glass have distinct presentation rules", () => {
  assert.match(dedicatedTheme, /data-showcase-theme="intron"[\s\S]*text-shadow:none/);
  assert.match(dedicatedTheme, /data-showcase-theme="vlad"[\s\S]*warm secondary as ceremonial accent/);
  assert.match(dedicatedTheme, /data-showcase-theme="lutetia"[\s\S]*backdrop-filter:blur\(14px\)/);
});

test("dedicated layer covers standard, final trailer, and assignment states without important overrides", () => {
  assert.match(dedicatedTheme, /#act-showcase-standard-page/);
  assert.match(dedicatedTheme, /poster-v2-trailer-stage__heading/);
  assert.match(dedicatedTheme, /neotokyo-sequence__screen--linked\.is-found/);
  assert.match(dedicatedTheme, /neotokyo-sequence__screen--linked\.is-read/);
  assert.doesNotMatch(dedicatedTheme, /!important/);
});