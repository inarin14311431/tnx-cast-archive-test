import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { countHardcodedColors } from "../scripts/hardcoded-colors-lib.mjs";
import { actShowcaseCss } from "./helpers/act-showcase-css.mjs";

// docs/ACT_SHOWCASE_SCENES.md §6 #7 (5th pattern: finale) / §4: the CSS of the FINALE pattern B, "key visual" (css-next/pages/act-showcase-patterns.css,
// source act-showcase-pattern-finale-b.css). It styles only its own page: every rule is scoped to
// [data-scene="finale"][data-scene-pattern="b"] with :where(), uses class names of its own (and names the shared shell it has to restyle:
// the ambient stage and the footer, which pattern A's rules, all scoped to pattern a, no longer reach), and takes its colors from the
// theme variables (a new showcase stylesheet has no hardcoded color; audit:showcase-colors holds the same line).
const MARK = '[data-scene="finale"][data-scene-pattern="b"]';
const SCOPE = `:where(${MARK},${MARK} *)`;
const css = actShowcaseCss("act-showcase-pattern-finale-b");
const withoutComments = text => text.replace(/\/\*[\s\S]*?\*\/|(^|[\s;{}])\/\/[^\n]*/g, "$1");
const read = async path => withoutComments(await readFile(new URL(path, import.meta.url), "utf8"));

function rules(text) {
  const source = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const found = [];
  const walk = (body, context) => {
    let index = 0;
    while (index < body.length) {
      const open = body.indexOf("{", index);
      if (open === -1) break;
      const prelude = body.slice(index, open).trim();
      let depth = 1;
      let end = open + 1;
      for (; end < body.length && depth; end += 1) depth += body[end] === "{" ? 1 : body[end] === "}" ? -1 : 0;
      const inner = body.slice(open + 1, end - 1);
      if (/^@(media|supports)/.test(prelude)) walk(inner, prelude);
      else found.push({ prelude, context, body: inner });
      index = end;
    }
  };
  walk(source, "");
  return found;
}

const all = rules(css);
const styleRules = all.filter(rule => !rule.prelude.startsWith("@"));
const keyframes = all.filter(rule => rule.prelude.startsWith("@keyframes"));

test("the finale pattern B source is the last stylesheet source and has rules", () => {
  assert.ok(styleRules.length >= 40, `${styleRules.length} rules`);
});

test("every rule is scoped to pattern B of the finale frame, so nothing outside that page is styled", () => {
  for (const rule of styleRules) {
    for (const selector of rule.prelude.split(/,(?![^(]*\))/).map(item => item.trim())) {
      // a pseudo-element has to be the last part of a selector (".x:after:where(...)" is not valid CSS and the rule is dropped): the scope comes before it
      assert.ok(selector.replace(/:(before|after)$/, "").endsWith(SCOPE), `not scoped: ${selector}`);
      assert.doesNotMatch(selector, /:(before|after):where\(/, `pseudo-element before the scope: ${selector}`);
    }
  }
});

test("only classes of its own are styled, besides the shared shell it restyles; pattern A's hooks and the observers' targets are never named", () => {
  const classes = new Set(css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/:where\([^)]*\)/g, "").match(/\.[A-Za-z_][\w-]*/g)?.map(name => name.slice(1)));
  // the ambient stage and the footer are in the static page; body.has-showcase-background and the sequence's body class only decide when a rule applies
  const shared = new Set(["ambient-stage", "footer", "scene-shell", "has-showcase-background", "showcase-neotokyo-intro-active"]);
  for (const name of classes) assert.ok(name.startsWith("neotokyo-finale-b") || shared.has(name), `unexpected class: ${name}`);
  for (const forbidden of ["poster-v2", "scene-opening", "opening-", "poster-final-act-trailer", "poster-supporting", "neotokyo-sequence__", "neotokyo-finale__", "showcase-poster-v2-ready", "showcase-story"]) {
    assert.ok(!css.includes(forbidden), `names ${forbidden}`);
  }
});

test("keyframes are named for the pattern", () => {
  assert.ok(keyframes.length >= 1);
  for (const rule of keyframes) assert.match(rule.prelude, /^@keyframes neotokyo-finale-b-/);
});

test("colors come from the theme variables: no #hex, rgb() or hsl(), and every color-mix() mixes a --showcase-* variable", () => {
  const code = withoutComments(css);
  assert.equal(countHardcodedColors(css, "css"), 0);
  assert.doesNotMatch(code, /#[0-9a-f]{3,8}\b/i);
  for (const mix of code.match(/color-mix\([^;{}]*\)/g) || []) assert.match(mix, /var\(--showcase-[a-z-]+\)/, mix);
});

test("only a short fade-in: it starts when the sequence has ended, stops for reduced motion, and nothing else moves", () => {
  const animated = styleRules.filter(rule => /animation\s*:/.test(rule.body) && !/animation:none/.test(rule.body));
  assert.equal(animated.length, 1, "one rule animates");
  assert.match(animated[0].prelude, /^body:not\(\.showcase-neotokyo-intro-active\) \.neotokyo-finale-b:where/);
  assert.match(animated[0].body, /animation:neotokyo-finale-b-in \.6s/);
  const reduced = styleRules.filter(rule => rule.context === "@media(prefers-reduced-motion:reduce)");
  assert.ok(reduced.some(rule => rule.prelude.startsWith("body:not(.showcase-neotokyo-intro-active) .neotokyo-finale-b:where") && /animation:none/.test(rule.body)));
  assert.equal(styleRules.filter(rule => /transition\s*:/.test(rule.body)).length, 0, "no transitions");
});

test("reduced motion, more contrast, forced colors and the phone width are answered", () => {
  const contexts = new Set(styleRules.map(rule => rule.context));
  for (const media of ["@media(prefers-reduced-motion:reduce)", "@media(prefers-contrast:more)", "@media(forced-colors:active)", "@media(max-width:760px)"]) {
    assert.ok(contexts.has(media), `no ${media} block`);
  }
});

test("each band shows the top of the picture (cover, 50% 6%, no stored focus), is cut on a slant, and a band without a picture is a themed surface", () => {
  const image = styleRules.find(item => item.prelude.startsWith(".neotokyo-finale-b__band-image"));
  assert.match(image.body, /object-fit:cover/);
  assert.match(image.body, /object-position:50% 6%/);
  assert.doesNotMatch(css, /transform:scale\(/, "no zoom: the saved image focus is not used");
  const band = styleRules.find(item => item.prelude.startsWith(".neotokyo-finale-b__band:where"));
  assert.match(band.body, /clip-path:polygon\(var\(--finale-b-cut\) 0,100% 0,calc\(100% - var\(--finale-b-cut\)\) 100%,0 100%\)/);
  const fallback = styleRules.find(item => item.prelude.startsWith(".neotokyo-finale-b__band-fallback"));
  assert.match(fallback.body, /background:linear-gradient\(160deg,color-mix\(in srgb,var\(--showcase-primary\)/);
  assert.match(fallback.body, /color:var\(--showcase-readable-text\)/);
});

test("the bands are equal columns for one to six casts; on a phone one to three stay in a row, four are 2 x 2, five are 3 + 2, six are 3 + 3", () => {
  const bands = styleRules.find(item => item.prelude.startsWith(".neotokyo-finale-b__bands:where"));
  assert.match(bands.body, /grid-template-columns:repeat\(var\(--finale-b-count,3\),minmax\(0,1fr\)\)/);
  const phone = styleRules.filter(rule => rule.context === "@media(max-width:760px)");
  const columns = count => phone.find(rule => rule.prelude.startsWith(`.neotokyo-finale-b__bands[data-count="${count}"]:where`))?.body;
  assert.match(columns(4), /grid-template-columns:repeat\(2,minmax\(0,1fr\)\);grid-template-rows:repeat\(2,/);
  assert.match(columns(5), /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(columns(6), /grid-template-columns:repeat\(3,minmax\(0,1fr\)\);grid-template-rows:repeat\(2,/);
  assert.equal(columns(1), undefined);
  assert.equal(columns(2), undefined);
  assert.equal(columns(3), undefined);
  // five: the first row is three bands of two columns, the second row two bands of three
  assert.ok(phone.some(rule => /data-count="5"\] \.neotokyo-finale-b__band:nth-child\(-n\+3\):where/.test(rule.prelude) && /grid-column:span 2/.test(rule.body)));
  assert.ok(phone.some(rule => /data-count="5"\] \.neotokyo-finale-b__band:nth-child\(n\+4\):where/.test(rule.prelude) && /grid-column:span 3/.test(rule.body)));
});

test("the act name sits low over the bands on a gradient of the theme background; the credits strip, the trailer, the cards and the guests follow in that order", async () => {
  const heading = styleRules.find(item => item.prelude.startsWith(".neotokyo-finale-b__heading"));
  assert.match(heading.body, /align-self:end/);
  assert.match(heading.body, /linear-gradient\(to top,color-mix\(in srgb,var\(--showcase-bg\) 96%/);
  const builder = await read("../js/act-showcase-finale-b.js");
  const order = [...builder.matchAll(/const parts = \[([^\]]+)\]/g)][0][1].split(",").map(item => item.trim().replace(/\(model\)$/, ""));
  assert.deepEqual(order, ["createHero", "createCredits", "createTrailer", "createCards", "createGuests"]);
});

test("the handle and the name are side by side and wrap only when the pair does not fit the card", () => {
  const name = styleRules.find(item => item.prelude.startsWith(".neotokyo-finale-b__name:where"));
  assert.match(name.body, /display:flex;flex-wrap:wrap;align-items:baseline/);
  const both = styleRules.filter(item => /__handle|__real/.test(item.prelude));
  assert.equal(both.length, 1, "one rule for both, so they cannot drift apart");
  assert.match(both[0].prelude, /\.neotokyo-finale-b__handle:where\([^)]*\),\.neotokyo-finale-b__real:where/);
});

test("the builder uses its own class names and none of pattern A's ids and hooks; the page plays it only through playWithFallback, building everything before touching the page", async () => {
  const builder = await read("../js/act-showcase-finale-b.js");
  const classes = new Set([...builder.matchAll(/element\("\w+", ["'`]([^"'`$]+)/g)].flatMap(match => match[1].split(" ")));
  for (const name of classes) assert.ok(name.startsWith("neotokyo-finale-b"), name);
  assert.doesNotMatch(builder, /opening-act-name|opening-ruler|opening-subtitle|poster-showcase-board-v2|poster-v2-|poster-final-act-trailer|poster-supporting-cast|scene-opening|FALLBACK_IMAGE|scan-failed|image-focus|getImageObjectPosition/);
  // the picture shows the top of the image through css, so no inline position, scale or origin is written
  assert.doesNotMatch(builder, /objectPosition|--tnx-image-/);
  const page = await read("../js/act-showcase-page.js");
  const draw = page.slice(page.indexOf("function renderFinaleB("), page.indexOf("function createShowcaseModel("));
  // it is built first (it may throw, the page is untouched), then the static hero is replaced, and the root is marked last
  assert.ok(draw.indexOf("createFinaleB({ model })") < draw.indexOf("opening.replaceWith(view)"));
  assert.ok(draw.indexOf("opening.replaceWith(view)") < draw.indexOf('root.setAttribute("data-scene-pattern", "b")'));
  assert.match(draw, /return \{ opening: null, board: null \}/);
  assert.match(page, /\[DEFAULT_SCENE_PATTERN\]: renderFinaleA,\s*b: renderFinaleB/);
});

test("the footer text is painted over the theme layer's on-dark colour (a rule of the same weight, later), and .scene-shell is named only there", () => {
  const rule = styleRules.find(item => item.prelude.startsWith(":root[data-showcase-theme] body#act-showcase-page footer.footer .scene-shell:where"));
  assert.ok(rule, "no footer text rule");
  assert.match(rule.body, /color:var\(--showcase-readable-muted\)/);
  assert.equal(styleRules.filter(item => item.prelude.includes("scene-shell")).length, 1);
});
