import test from "node:test";
import assert from "node:assert/strict";
import { TRAILING_SOURCES, actShowcaseCss, actShowcaseSources, actShowcaseTrailingSources } from "./helpers/act-showcase-css.mjs";

// The assign-cards sections: structure in act-showcase-scenes.css (end of the file) and theme colours in
// act-showcase-theme-scenes.css (after visual-emphasis). The latter may follow the "final" visual-emphasis layer
// only because it styles nothing but its own card classes.
const selectorsOf = css => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(?:^|})\s*([^{}@]+)\{/g)]
  .flatMap(match => match[1].split(","))
  .map(selector => selector.trim())
  .filter(Boolean);

test("assign-cards sections sit at the end of their bundles", () => {
  const sources = actShowcaseSources().map(item => item.file);
  assert.equal(sources.at(-1), "act-showcase-assign-cards-theme.css");
  assert.equal(sources.indexOf("act-showcase-visual-emphasis.css") + 1, sources.indexOf("act-showcase-assign-cards-theme.css"));
  assert.equal(sources[sources.indexOf("act-showcase-handout-live-frame.css") + 1], "act-showcase-assign-cards.css");
  assert.deepEqual(actShowcaseTrailingSources().map(item => item.file), TRAILING_SOURCES);
});

test("the section after the final visual-emphasis layer only styles the style-card classes", () => {
  const selectors = selectorsOf(actShowcaseCss("act-showcase-assign-cards-theme"));
  assert.ok(selectors.length > 0);
  for (const selector of selectors) assert.match(selector, /neotokyo-style-card/, selector);
});

test("the assign-cards structure section never targets legacy chip selectors", () => {
  const css = actShowcaseCss("act-showcase-assign-cards");
  const selectors = selectorsOf(css);
  assert.ok(selectors.length > 0);
  for (const selector of selectors) {
    // the one rule outside the card classes is the phone layout fix for the linked layout
    if (/neotokyo-sequence__linked-layout/.test(selector)) continue;
    assert.match(selector, /neotokyo-style-card|neotokyo-sequence__style-cards|neotokyo-sequence__cast--linked\.is-styles-pending/, selector);
  }
  assert.doesNotMatch(css, /!important/);
});

test("the cards carry no artwork: no image urls and no pictorial glyphs", () => {
  for (const name of ["act-showcase-assign-cards", "act-showcase-assign-cards-theme"]) {
    assert.doesNotMatch(actShowcaseCss(name), /url\(/, name);
  }
});
