import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../css-next/pages/act-showcase-entry.css", import.meta.url), "utf8");
const dedicatedTheme = await readFile(new URL("../css-next/pages/act-showcase-dedicated-themes.css", import.meta.url), "utf8");
const surfaceSystem = await readFile(new URL("../css-next/pages/act-showcase-theme-surface-system.css", import.meta.url), "utf8");
const phaseContract = await readFile(new URL("../css-next/pages/act-showcase-theme-phase-contract.css", import.meta.url), "utf8");
const combinedTheme = `${dedicatedTheme}\n${surfaceSystem}\n${phaseContract}`;

const ids = ["nova", "intron", "vlad", "lutetia"];

test("dedicated ACT tokens, shared surfaces, and the final phase contract load in order", () => {
  const dedicated = entry.indexOf("act-showcase-dedicated-themes.css");
  const surface = entry.indexOf("act-showcase-theme-surface-system.css");
  const phase = entry.indexOf("act-showcase-theme-phase-contract.css");
  assert.ok(dedicated >= 0 && surface > dedicated && phase > surface);
  assert.match(entry.trim().split("\n").at(-1), /^@import "\.\/act-showcase-theme-phase-contract\.css\?v=[A-Za-z0-9._-]+";$/);
  assert.doesNotMatch(entry, /act-showcase-theme\.css|act-showcase-theme-coverage\.css|act-showcase-cinematic-theme\.css/);
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

test("intermediate cinematic sequence is driven by dedicated theme tokens and phase-owned surfaces", () => {
  for (const selector of [
    ".neotokyo-sequence__shell",
    ".neotokyo-sequence__trailer-terminal",
    ".neotokyo-sequence__readout.is-terminal-readout",
    ".neotokyo-sequence__handout-panel",
    ".neotokyo-sequence__assign-frame",
    ".neotokyo-sequence__cast--linked",
    ".neotokyo-sequence__search--linked",
    ".neotokyo-finale__cast-card"
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

test("phase contract closes the high-specificity gaps in trailer, matching, title credits, and finale", () => {
  assert.match(phaseContract, /body#act-showcase-page/);
  assert.match(phaseContract, /stage\.is-trailer-scroll[\s\S]*overflow:hidden/);
  assert.match(phaseContract, /readout\.is-terminal-readout[\s\S]*overflow:auto/);
  assert.match(phaseContract, /neotokyo-sequence__ruler-credit/);
  assert.match(phaseContract, /neotokyo-sequence__search--linked\.is-found/);
  assert.match(phaseContract, /neotokyo-sequence__screen--finale[\s\S]*neotokyo-finale__cast-card/);
  assert.match(phaseContract, /poster-supporting-card/);
});

test("Dossier specifically eliminates legacy dark islands", () => {
  assert.match(phaseContract, /data-showcase-theme="intron"[\s\S]*screen--title/);
  assert.match(phaseContract, /data-showcase-theme="intron"[\s\S]*search--linked\.is-found/);
  assert.match(phaseContract, /data-showcase-theme="intron"[\s\S]*neotokyo-finale__cast-card/);
  assert.match(phaseContract, /data-showcase-theme="intron"[\s\S]*ruler-name[\s\S]*color:#171717/);
  assert.match(surfaceSystem, /data-showcase-theme="intron"[\s\S]*--showcase-surface-1:rgba\(255,255,255,.98\)/);
});

test("theme stack covers standard and cinematic states without important overrides", () => {
  assert.match(combinedTheme, /#act-showcase-standard-page/);
  assert.match(dedicatedTheme, /poster-v2-trailer-stage__heading/);
  assert.match(dedicatedTheme, /neotokyo-sequence__screen--linked\.is-found/);
  assert.match(dedicatedTheme, /neotokyo-sequence__screen--linked\.is-read/);
  assert.doesNotMatch(combinedTheme, /!important/);
});