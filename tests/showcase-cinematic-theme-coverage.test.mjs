import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../css-next/pages/act-showcase-entry.css", import.meta.url), "utf8");
const dedicatedTheme = await readFile(new URL("../css-next/pages/act-showcase-dedicated-themes.css", import.meta.url), "utf8");
const surfaceSystem = await readFile(new URL("../css-next/pages/act-showcase-theme-surface-system.css", import.meta.url), "utf8");
const showcaseHtml = await readFile(new URL("../act-showcase.html", import.meta.url), "utf8");
const combinedTheme = `${dedicatedTheme}\n${surfaceSystem}`;

const ids = ["nova", "intron", "vlad", "lutetia"];

test("dedicated ACT tokens are followed by one final surface ownership layer", () => {
  assert.match(entry, /act-showcase-dedicated-themes\.css\?v=1/);
  assert.match(entry, /act-showcase-theme-surface-system\.css\?v=1/);
  assert.doesNotMatch(entry, /act-showcase-theme\.css|act-showcase-theme-coverage\.css|act-showcase-cinematic-theme\.css/);
  const lines = entry.trim().split("\n");
  assert.equal(lines.at(-2), '@import "./act-showcase-dedicated-themes.css?v=1";');
  assert.equal(lines.at(-1), '@import "./act-showcase-theme-surface-system.css?v=1";');
  assert.match(showcaseHtml, /act-showcase-entry\.css\?v=13/);
});

test("all four ACT-specific themes own explicit tokens", () => {
  for (const id of ids) {
    assert.match(dedicatedTheme, new RegExp(`:root\\[data-showcase-theme=["']${id}["']\\]`));
    assert.match(surfaceSystem, new RegExp(`:root\\[data-showcase-theme=["']${id}["']\\]`));
  }
  assert.match(dedicatedTheme, /--showcase-theme-name:"NEON GRID"/);
  assert.match(dedicatedTheme, /--showcase-theme-name:"DOSSIER"/);
  assert.match(dedicatedTheme, /--showcase-theme-name:"CRIMSON NOIR"/);
  assert.match(dedicatedTheme, /--showcase-theme-name:"ORBITAL GLASS"/);
});

test("intermediate cinematic sequence is driven by dedicated theme tokens and themed surfaces", () => {
  for (const selector of [
    ".neotokyo-sequence__shell",
    ".neotokyo-sequence__trailer-terminal",
    ".neotokyo-sequence__readout.is-terminal-readout",
    ".neotokyo-sequence__handout-panel",
    ".neotokyo-sequence__assign-frame",
    ".neotokyo-sequence__cast--linked"
  ]) {
    assert.ok(combinedTheme.includes(selector), `theme stack missing cinematic selector: ${selector}`);
  }
  assert.match(combinedTheme, /var\(--showcase-bg\)/);
  assert.match(combinedTheme, /var\(--showcase-surface(?:-rgb|-0|-1|-2|-3)?\)/);
  assert.match(combinedTheme, /var\(--showcase-primary(?:-rgb)?\)/);
  assert.match(combinedTheme, /var\(--showcase-secondary(?:-rgb)?\)/);
  assert.match(combinedTheme, /var\(--showcase-tertiary(?:-rgb)?\)/);
  assert.match(combinedTheme, /var\(--showcase-text\)/);
  assert.match(combinedTheme, /var\(--showcase-muted\)/);
});

test("surface system owns the five reviewed weak spots", () => {
  assert.match(surfaceSystem, /screen--trailer[\s\S]*max-height:100%/);
  assert.match(surfaceSystem, /neotokyo-sequence__trailer-terminal[\s\S]*max-height:min\(58svh,620px\)/);
  assert.match(surfaceSystem, /readout\.is-terminal-readout[\s\S]*overflow:auto/);
  assert.match(surfaceSystem, /cast--linked[\s\S]*cast-detail:before[\s\S]*showcase-name-surface/);
  assert.match(surfaceSystem, /screen--finale[\s\S]*summary-head[\s\S]*showcase-surface/);
  assert.match(surfaceSystem, /showcase-poster-v2-ready[\s\S]*poster-v2-frame[\s\S]*poster-v2-panel/);
  assert.match(surfaceSystem, /poster-supporting-cast[\s\S]*poster-supporting-card/);
});

test("Dossier, Crimson Noir, and Orbital Glass have distinct full-surface presentation rules", () => {
  assert.match(surfaceSystem, /data-showcase-theme="intron"[\s\S]*--showcase-surface-1:rgba\(255,255,255,.98\)/);
  assert.match(surfaceSystem, /data-showcase-theme="intron"[\s\S]*cast-detail h3[\s\S]*text-shadow:none/);
  assert.match(surfaceSystem, /data-showcase-theme="vlad"[\s\S]*--showcase-name-surface/);
  assert.match(surfaceSystem, /data-showcase-theme="lutetia"[\s\S]*backdrop-filter:blur\(16px\)/);
});

test("theme stack covers standard, final trailer, and assignment states without important overrides", () => {
  assert.match(combinedTheme, /#act-showcase-standard-page/);
  assert.match(dedicatedTheme, /poster-v2-trailer-stage__heading/);
  assert.match(dedicatedTheme, /neotokyo-sequence__screen--linked\.is-found/);
  assert.match(dedicatedTheme, /neotokyo-sequence__screen--linked\.is-read/);
  assert.doesNotMatch(combinedTheme, /!important/);
});