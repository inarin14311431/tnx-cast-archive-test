import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { countHardcodedColors } from "../scripts/hardcoded-colors-lib.mjs";
import { actShowcaseCss } from "./helpers/act-showcase-css.mjs";

// docs/ACT_SHOWCASE_SCENES.md §6 #7 (6th pattern: loading) / §4: the CSS of the LOADING pattern B, the "boot terminal" (css-next/pages/act-showcase-patterns.css,
// source act-showcase-pattern-loading-b.css). It styles only its own screen: every rule is scoped to
// [data-scene="loading"][data-scene-pattern="b"] with :where(), uses class names of its own, and takes its colors from the theme variables
// (a new showcase stylesheet has no hardcoded color; audit:showcase-colors holds the same line).
const MARK = '[data-scene="loading"][data-scene-pattern="b"]';
const SCOPE = `:where(${MARK},${MARK} *)`;
const css = actShowcaseCss("act-showcase-pattern-loading-b");
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
const rule = prefix => styleRules.find(item => item.prelude.startsWith(prefix));

test("the loading pattern B source is the last stylesheet source and has rules", () => {
  assert.ok(styleRules.length >= 25, `${styleRules.length} rules`);
});

test("every rule is scoped to pattern B of the loading frame, so nothing outside that screen is styled", () => {
  for (const item of styleRules) {
    for (const selector of item.prelude.split(/,(?![^(]*\))/).map(part => part.trim())) {
      // a pseudo-element has to be the last part of a selector (".x:after:where(...)" is not valid CSS and the rule is dropped): the scope comes before it
      assert.ok(selector.replace(/:(before|after)$/, "").endsWith(SCOPE), `not scoped: ${selector}`);
      assert.doesNotMatch(selector, /:(before|after):where\(/, `pseudo-element before the scope: ${selector}`);
    }
  }
});

test("only classes of its own are styled; pattern A's hooks and the observers' targets are never named", () => {
  const classes = new Set(css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/:where\([^)]*\)/g, "").match(/\.[A-Za-z_][\w-]*/g)?.map(name => name.slice(1)));
  // neotokyo-sequence__screen is the class every screen carries (the swap puts it on the stage); is-visible is the class the swap adds
  for (const name of classes) assert.ok(name.startsWith("neotokyo-loading-b") || ["neotokyo-sequence__screen", "is-visible"].includes(name), `unexpected class: ${name}`);
  for (const forbidden of ["screen--opening", "__bootlog", "__access-seal", "is-cinematic-access", "__opening-title", "__opening-sub", "__eyebrow", "__micro", "__terminal", "poster-v2", "neotokyo-finale__"]) {
    assert.ok(!css.includes(forbidden), `names ${forbidden}`);
  }
});

test("keyframes are named for the pattern", () => {
  assert.ok(keyframes.length >= 3);
  for (const item of keyframes) assert.match(item.prelude, /^@keyframes neotokyo-loading-b-/);
});

test("colors come from the theme variables: no #hex, rgb() or hsl(), and every color-mix() mixes a --showcase-* variable", () => {
  const code = withoutComments(css);
  assert.equal(countHardcodedColors(css, "css"), 0);
  assert.doesNotMatch(code, /#[0-9a-f]{3,8}\b/i);
  for (const mix of code.match(/color-mix\([^;{}]*\)/g) || []) assert.match(mix, /var\(--showcase-[a-z-]+\)/, mix);
});

test("the terminal fills the stage; the log box is anchored to its bottom, clips what is pushed out above and never scrolls", () => {
  const screen = rule(".neotokyo-sequence__screen.neotokyo-loading-b:where");
  assert.match(screen.body, /position:absolute/);
  assert.match(screen.body, /inset:0/);
  assert.match(screen.body, /grid-template-rows:auto minmax\(0,1fr\)/);
  assert.match(screen.body, /font:400 [^;]*"Share Tech Mono","Noto Sans JP",monospace/);
  const log = rule(".neotokyo-loading-b__log:where");
  assert.match(log.body, /display:flex;flex-direction:column;justify-content:flex-end/);
  assert.match(log.body, /overflow:hidden/);
  assert.match(log.body, /min-height:0/);
  assert.doesNotMatch(log.body, /overflow(-y)?:(auto|scroll)/);
});

test("a typed letter never moves to the next row: lines break anywhere, and nothing sets display on a line (the hidden attribute must hide it)", () => {
  const line = rule(".neotokyo-loading-b__line:where");
  assert.match(line.body, /word-break:break-all/);
  assert.match(line.body, /overflow-wrap:anywhere/);
  for (const item of styleRules.filter(part => /__line|__granted/.test(part.prelude) && !/:(before|after)$/.test(part.prelude))) {
    assert.doesNotMatch(item.body, /(^|;)display:/, item.prelude);
  }
});

test("the caret is on the line being typed (data-typing) and blinks; the prompt is generated content, the caret follows the pseudo-element order rule", () => {
  const caret = styleRules.find(part => /\.neotokyo-loading-b__line\[data-typing\]:where\(.*\):after$/.test(part.prelude) && part.context === "");
  assert.ok(caret, "caret rule");
  assert.match(caret.body, /animation:neotokyo-loading-b-caret 1s steps\(1,end\) infinite/);
  assert.match(caret.body, /content:""/);
  const prompt = styleRules.find(part => /\.neotokyo-loading-b__line:where\(.*\):before$/.test(part.prelude) && part.context === "");
  assert.match(prompt.body, /content:">"/);
});

test("motion is the screen's power-on, ACCESS GRANTED's flicker and the caret; reduced motion stops the first two, the caret stays on and still", () => {
  const animated = styleRules.filter(part => part.context === "" && /animation\s*:/.test(part.body));
  assert.equal(animated.length, 3);
  assert.equal(styleRules.filter(part => /transition\s*:/.test(part.body)).length, 0, "no transitions");
  const reduced = styleRules.filter(part => part.context === "@media(prefers-reduced-motion:reduce)");
  assert.equal(reduced.length, 3);
  for (const part of reduced) assert.match(part.body, /animation:none/);
});

test("reduced motion, more contrast, forced colors, the phone width, a narrow and a low window are answered", () => {
  const contexts = new Set(styleRules.map(part => part.context));
  for (const media of ["@media(prefers-reduced-motion:reduce)", "@media(prefers-contrast:more)", "@media(forced-colors:active)", "@media(max-width:760px)", "@media(max-width:520px)", "@media(max-height:520px)"]) {
    assert.ok(contexts.has(media), `no ${media} block`);
  }
});

test("the builder gives the screen no hook of pattern A: its own classes, the bar and the log hidden from the live region, every line built hidden", async () => {
  const source = await read("../js/act-showcase-loading-b.js");
  assert.match(source, /element\("section", "neotokyo-sequence__screen neotokyo-loading-b"\)/);
  for (const forbidden of ["screen--opening", "__bootlog", "__access-seal", "is-cinematic-access", "__opening-"]) assert.ok(!source.includes(forbidden), forbidden);
  assert.match(source, /bar\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(source, /log\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(source, /row\.hidden = true;/);
  assert.match(source, /granted\.hidden = true;/);
});

test("the pattern types into text nodes and swaps the screen once; it waits for fonts only before typing, never to show the screen", async () => {
  const source = await read("../js/act-showcase-neotokyo.js");
  const body = source.slice(source.indexOf("async function showOpeningB"), source.indexOf("async function fontsForText"));
  assert.match(body, /swapScreen\(state, screen\);/);
  assert.doesNotMatch(body, /waitForFonts/);
  assert.match(body, /markScene\(screen, scene, "b"\);/);
  const typing = source.slice(source.indexOf("async function typeBootLines"), source.indexOf("async function showActTitle"));
  assert.match(typing, /item\.textNode\.data = /);
  assert.doesNotMatch(typing, /textContent|innerHTML|append|replaceChildren/);
  assert.match(source, /Promise\.race\(\[Promise\.allSettled\(loads\), wait\(state, LOADING_B_FONT_WAIT_MS\)\]\)/);
});

test("the length: the typing about 2.2 s, ACCESS GRANTED held 1.2 s, at most 1 s longer than pattern A's 2.9 s; reduced motion holds A's 2.9 s", async () => {
  const source = await read("../js/act-showcase-neotokyo.js");
  const number = name => Number(source.match(new RegExp(`const ${name} = (\\d+);`))[1]);
  const typing = number("LOADING_B_TYPE_MS");
  const hold = number("LOADING_B_HOLD_MS");
  assert.equal(typing, 2200);
  assert.equal(hold, 1200);
  assert.ok(typing + hold <= 2900 + 1000, "no more than 1 s longer than A");
  assert.equal(number("LOADING_B_REDUCED_HOLD_MS"), 2900);
  assert.match(source, /await wait\(state, 2900\);/, "pattern A still holds its ACCESS screen 2900 ms");
});
