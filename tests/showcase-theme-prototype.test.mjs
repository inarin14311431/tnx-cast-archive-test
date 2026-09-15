import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const generatorHtml = read("showcase-generator.html");
const generator = read("js/showcase-generator-v3.js");
const publisher = read("js/showcase-dynamic-publish-v3.js");
const restore = read("js/showcase-edit-restore.js");
const runtime = read("js/act-showcase-theme-runtime.js");
const cinematicHtml = read("act-showcase.html");
const cinematicBootstrap = read("js/act-showcase-bootstrap.js");
const standardHtml = read("act-showcase-standard.html");
const cinematicPage = read("js/act-showcase-page.js");
const standardPage = read("js/act-showcase-standard.js");
const themeCss = read("css-next/pages/act-showcase-theme.css");
const entryCss = read("css-next/pages/act-showcase-entry.css");

const themes = ["nova", "intron", "vlad", "lutetia"];
for (const theme of themes) {
  assert.match(generatorHtml, new RegExp(`option value=["']${theme}["']`), `${theme} must be selectable in the generator`);
  assert.match(runtime, new RegExp(`${theme}: Object\\.freeze`), `${theme} must be supported by the runtime`);
  assert.match(themeCss, new RegExp(`data-showcase-theme=["']${theme}["']`), `${theme} must have showcase theme tokens`);
}

assert.match(generatorHtml, /id="showcase-theme"/, "generator must expose a showcase theme selector");
assert.match(generator, /showcaseTheme: document\.querySelector\("#showcase-theme"\)/, "generator must read the theme selector");
assert.match(generator, /theme: normalizeShowcaseTheme\(elements\.showcaseTheme\?\.value\)/, "generated HTML must capture selected theme");
assert.match(generator, /data-showcase-theme=/, "generated HTML must carry a fixed theme attribute");
assert.match(generator, /createOutputCss\(backgroundStyle, data\.theme\)/, "generated HTML CSS must receive the selected theme");

assert.match(publisher, /showcaseData\.theme = normalizeShowcaseTheme\(showcaseThemeField\?\.value\)/, "dynamic publish must persist theme inside showcase_data");
assert.match(publisher, /act-showcase-standard\.html\?id=.*&theme=/s, "standard public URL must carry theme for first paint");
assert.match(publisher, /act-showcase\.html\?id=.*&theme=/s, "cinematic public URL must carry theme for first paint");
assert.match(restore, /setField\(elements\.showcaseTheme,[\s\S]*showcase\.theme/, "edit restore must restore saved theme");

assert.doesNotMatch(cinematicHtml, /act-showcase-theme-runtime\.js/, "cinematic HTML must keep the one-bootstrap architecture");
assert.match(cinematicBootstrap, /^await import\("\.\/act-showcase-theme-runtime\.js\?v=1"\);/, "cinematic bootstrap must initialize theme runtime before other showcase modules");
assert.match(cinematicHtml, /act-showcase-entry\.css\?v=9/, "cinematic public showcase must load the themed showcase entry bundle");
assert.match(standardHtml, /act-showcase-theme-runtime\.js\?v=1/, "standard public showcase must load theme runtime");
assert.match(standardHtml, /act-showcase-theme\.css\?v=1/, "standard public showcase must load the showcase theme layer");
assert.match(entryCss, /act-showcase-theme\.css\?v=1/, "cinematic theme layer must be imported last by the showcase entry bundle");
assert.match(cinematicPage, /TNX_SHOWCASE_THEME\?\.applySaved\(data\?\.theme\)/, "cinematic page must apply saved theme data");
assert.match(standardPage, /TNX_SHOWCASE_THEME\?\.applySaved\(data\?\.theme\)/, "standard page must apply saved theme data");

assert.match(themeCss, /Intron deliberately flips the showcase into a light municipal-record aesthetic/, "Intron must include dedicated light-theme overrides");
assert.match(themeCss, /Poster-v2 is the current cinematic presentation/, "cinematic poster-v2 must receive dedicated theme overrides");
assert.doesNotMatch(themeCss, /:root\[data-showcase-theme="nova"\][^{]*body\.showcase-poster-v2-ready/, "Nova should preserve the existing visual baseline instead of receiving broad overrides");

console.log("showcase theme prototype contract: ok");
