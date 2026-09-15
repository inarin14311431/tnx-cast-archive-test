import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const generatorHtml = read("showcase-generator.html");
const generator = read("js/showcase-generator-v3.js");
const generatorLoader = read("js/showcase-generator-loader.js");
const generatedOutput = read("js/showcase-dedicated-output.js");
const publisher = read("js/showcase-dynamic-publish-v3.js");
const restore = read("js/showcase-edit-restore.js");
const runtime = read("js/act-showcase-theme-runtime.js");
const cinematicHtml = read("act-showcase.html");
const cinematicBootstrap = read("js/act-showcase-bootstrap.js");
const standardHtml = read("act-showcase-standard.html");
const cinematicPage = read("js/act-showcase-page.js");
const standardPage = read("js/act-showcase-standard.js");
const dedicatedCss = read("css-next/pages/act-showcase-dedicated-themes.css");
const entryCss = read("css-next/pages/act-showcase-entry.css");

const themes = ["nova", "intron", "vlad", "lutetia"];
for (const theme of themes) {
  assert.match(generatorHtml, new RegExp(`option value=["']${theme}["']`), `${theme} compatibility id must remain selectable`);
  assert.match(runtime, new RegExp(`${theme}: Object\\.freeze`), `${theme} compatibility id must remain supported by runtime`);
  assert.match(dedicatedCss, new RegExp(`data-showcase-theme=["']${theme}["']`), `${theme} must have ACT-specific theme tokens`);
}

assert.match(generatorHtml, /ネオン・グリッド \/ NEON GRID/);
assert.match(generatorHtml, /モノクローム・ドシエ \/ DOSSIER/);
assert.match(generatorHtml, /クリムゾン・ノワール \/ CRIMSON NOIR/);
assert.match(generatorHtml, /オービタル・グラス \/ ORBITAL GLASS/);
assert.match(generatorHtml, /HTML生成・スタンダード版・豪華版の3出力へ共通適用/);
assert.match(runtime, /storage ids are intentionally kept|Storage ids are intentionally kept/i);
assert.match(runtime, /label: "ネオン・グリッド"/);
assert.match(runtime, /label: "モノクローム・ドシエ"/);

assert.match(generator, /showcaseTheme: document\.querySelector\("#showcase-theme"\)/, "generator must still read the theme selector");
assert.match(publisher, /showcaseData\.theme = normalizeShowcaseTheme\(showcaseThemeField\?\.value\)/, "dynamic publish must persist theme inside showcase_data");
assert.match(restore, /setField\(elements\.showcaseTheme,[\s\S]*showcase\.theme/, "edit restore must restore saved compatibility ids");

assert.match(generatorLoader, /showcase-dedicated-output\.js\?v=1/, "generator must load the standard-output synchronizer");
assert.match(generatedOutput, /act-showcase-standard\.css\?v=3/);
assert.match(generatedOutput, /act-showcase-standard-hotfix\.css\?v=1/);
assert.match(generatedOutput, /act-showcase-dedicated-themes\.css\?v=1/);
assert.match(generatedOutput, /body\.id = "act-showcase-standard-page"/);
assert.match(generatedOutput, /showcaseOutput = OUTPUT_MARKER/);
assert.match(generatedOutput, /showcase-end wrap/);
assert.match(generatedOutput, /hero__scroll-cue/);

assert.doesNotMatch(cinematicHtml, /act-showcase-theme-runtime\.js/, "cinematic HTML must keep one-bootstrap architecture");
assert.match(cinematicBootstrap, /^await import\("\.\/act-showcase-theme-runtime\.js\?v=2"\);/, "cinematic bootstrap must initialize dedicated runtime first");
assert.match(cinematicHtml, /act-showcase-entry\.css\?v=12/);
assert.match(standardHtml, /act-showcase-theme-runtime\.js\?v=2/);
assert.match(standardHtml, /act-showcase-dedicated-themes\.css\?v=1/);
assert.doesNotMatch(standardHtml, /act-showcase-theme(?:-coverage)?\.css/);
assert.match(entryCss, /act-showcase-dedicated-themes\.css\?v=1/);
assert.doesNotMatch(entryCss, /act-showcase-theme\.css|act-showcase-theme-coverage\.css|act-showcase-cinematic-theme\.css/);
assert.match(cinematicPage, /TNX_SHOWCASE_THEME\?\.applySaved\(data\?\.theme\)/);
assert.match(standardPage, /TNX_SHOWCASE_THEME\?\.applySaved\(data\?\.theme\)/);

assert.match(dedicatedCss, /STANDARD \+ generated standalone HTML/);
assert.match(dedicatedCss, /CINEMATIC \/ deluxe/);
assert.match(dedicatedCss, /SYSTEM ACCESS \/ title \/ trailer readout/);
assert.match(dedicatedCss, /HANDOUT -> CAST ASSIGN/);
assert.match(dedicatedCss, /Final ACT TRAILER stage/);
assert.match(dedicatedCss, /#act-showcase-standard-page/);
assert.match(dedicatedCss, /neotokyo-sequence__trailer-terminal/);
assert.match(dedicatedCss, /neotokyo-sequence__handout-panel/);
assert.match(dedicatedCss, /neotokyo-sequence__assign-frame/);
assert.match(dedicatedCss, /poster-v2-trailer-stage__heading/);
assert.doesNotMatch(dedicatedCss, /!important/);

console.log("dedicated showcase theme contract: ok");