import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [surface, phase, entry, standardHtml, output, loader, generatorHtml] = await Promise.all([
  read("css-next/pages/act-showcase-theme-surface-system.css"),
  read("css-next/pages/act-showcase-theme-phase-contract.css"),
  read("css-next/pages/act-showcase-entry.css"),
  read("act-showcase-standard.html"),
  read("js/showcase-dedicated-output.js"),
  read("js/showcase-generator-loader.js"),
  read("showcase-generator.html")
]);

test("shared surface system is followed by the cinematic phase contract", () => {
  assert.ok(entry.indexOf("act-showcase-dedicated-themes.css") < entry.indexOf("act-showcase-theme-surface-system.css"));
  assert.ok(entry.indexOf("act-showcase-theme-surface-system.css") < entry.indexOf("act-showcase-theme-phase-contract.css"));
  assert.equal(entry.trim().split("\n").at(-1), '@import "./act-showcase-theme-phase-contract.css?v=1";');
  assert.match(standardHtml, /act-showcase-theme-surface-system\.css\?v=1/);
  assert.match(output, /act-showcase-theme-surface-system\.css\?v=1/);
  assert.match(output, /dedicated-standard-v2/);
  assert.match(loader, /showcase-dedicated-output\.js\?v=2/);
  assert.match(generatorHtml, /showcase-generator-loader\.js\?v=33/);
});

test("reviewed cinematic surfaces remain theme-owned", () => {
  for (const selector of [
    ".neotokyo-sequence__trailer-terminal",
    ".neotokyo-sequence__readout.is-terminal-readout",
    ".neotokyo-sequence__cast--linked",
    ".neotokyo-sequence__summary-head",
    ".neotokyo-sequence__overview",
    ".poster-v2-frame",
    ".poster-v2-panel",
    ".poster-supporting-cast",
    ".poster-supporting-card"
  ]) {
    assert.ok(surface.includes(selector) || phase.includes(selector), `theme layer missing ${selector}`);
  }
  assert.match(surface, /--showcase-surface-0/);
  assert.match(surface, /--showcase-border-strong/);
  assert.match(surface, /--showcase-name-surface/);
});

test("ACT TRAILER has a high-specificity viewport contract and only its readout scrolls", () => {
  assert.match(phase, /body#act-showcase-page[\s\S]*stage\.is-trailer-scroll[\s\S]*overflow:hidden/);
  assert.match(phase, /screen--trailer[\s\S]*max-height:min\(92svh,760px\)[\s\S]*overflow:hidden/);
  assert.match(phase, /trailer-terminal[\s\S]*max-height:min\(58svh,560px\)[\s\S]*overflow:hidden/);
  assert.match(phase, /readout\.is-terminal-readout[\s\S]*max-height:min\(46svh,440px\)[\s\S]*overflow:auto[\s\S]*scrollbar-gutter:stable/);
  assert.match(phase, /@media\(max-height:760px\) and \(min-width:761px\)/);
});

test("assigned cast name keeps its dedicated contrast surface and Dossier removes glow", () => {
  assert.match(surface, /cast--linked[\s\S]*cast-detail:before[\s\S]*background:var\(--showcase-name-surface\)/);
  assert.match(surface, /cast-detail h3[\s\S]*color:var\(--showcase-text\)/);
  assert.match(surface, /data-showcase-theme="intron"[\s\S]*cast-detail h3[\s\S]*color:#171717[\s\S]*text-shadow:none/);
});

test("all four dedicated personalities alter full surfaces without important overrides", () => {
  for (const id of ["nova", "intron", "vlad", "lutetia"]) {
    assert.match(surface, new RegExp(`:root\\[data-showcase-theme=["']${id}["']\\]`));
  }
  assert.match(surface, /data-showcase-theme="intron"[\s\S]*--showcase-surface-1:rgba\(255,255,255,.98\)/);
  assert.match(surface, /data-showcase-theme="vlad"[\s\S]*--showcase-border-strong:rgba\(255,56,82,.68\)/);
  assert.match(surface, /data-showcase-theme="lutetia"[\s\S]*backdrop-filter:blur\(16px\)/);
  assert.doesNotMatch(`${surface}\n${phase}`, /!important/);
});