import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { countHardcodedColors } from "../scripts/hardcoded-colors-lib.mjs";
import { actShowcaseCss } from "./helpers/act-showcase-css.mjs";

// docs/ACT_SHOWCASE_SCENES.md §6 #7 (4th pattern: handout-assign) / §4: the CSS of the HANDOUT / ASSIGN pattern B (css-next/pages/act-showcase-patterns.css,
// source act-showcase-pattern-assign-b.css). It styles only its own screen: every rule is scoped to
// [data-scene="handout-assign"][data-scene-pattern="b"] with :where(), uses class names of its own, and takes its colors from the
// theme variables (a new showcase stylesheet has no hardcoded color; audit:showcase-colors holds the same line).
const MARK = '[data-scene="handout-assign"][data-scene-pattern="b"]';
const SCOPE = `:where(${MARK},${MARK} *)`;
const css = actShowcaseCss("act-showcase-pattern-assign-b");
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

test("the handout-assign pattern B source has rules", () => {
  assert.ok(styleRules.length >= 40, `${styleRules.length} rules`);
});

test("every rule is scoped to pattern B of the handout-assign frame, so nothing outside that screen is styled", () => {
  for (const rule of styleRules) {
    for (const selector of rule.prelude.split(/,(?![^(]*\))/).map(item => item.trim())) {
      assert.ok(selector.endsWith(SCOPE), `not scoped: ${selector}`);
    }
  }
});

test("only classes of its own are styled (and the two the typed text needs); pattern A's hooks and the observers' targets are never named", () => {
  const classes = new Set(css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/:where\([^)]*\)/g, "").match(/\.[A-Za-z_][\w-]*/g)?.map(name => name.slice(1)));
  // the read / unread spans are made by prepareSplitReadout (shared with the trailer): the caret and the hidden unread part are drawn here
  const shared = new Set(["neotokyo-sequence__screen", "is-visible", "is-flipped", "is-role", "neotokyo-sequence__readout-read", "neotokyo-sequence__readout-unread"]);
  for (const name of classes) assert.ok(name.startsWith("neotokyo-assign-b") || shared.has(name), `unexpected class: ${name}`);
  for (const forbidden of ["neotokyo-sequence__screen--linked", "neotokyo-sequence__handout-panel", "neotokyo-sequence__assign-panel", "neotokyo-sequence__cast--linked", "neotokyo-style-card", "neotokyo-story__", "is-handout-scroll", "is-splitting"]) {
    assert.ok(!css.includes(forbidden), `names ${forbidden}`);
  }
});

test("keyframes are named for the pattern", () => {
  assert.ok(keyframes.length >= 2);
  for (const rule of keyframes) assert.match(rule.prelude, /^@keyframes neotokyo-assign-b-/);
});

test("colors come from the theme variables: no #hex, rgb() or hsl(), and every color-mix() mixes a --showcase-* variable", () => {
  const code = withoutComments(css);
  assert.equal(countHardcodedColors(css, "css"), 0);
  assert.doesNotMatch(code, /#[0-9a-f]{3,8}\b/i);
  for (const mix of code.match(/color-mix\([^;{}]*\)/g) || []) assert.match(mix, /var\(--showcase-[a-z-]+\)/, mix);
});

test("things appear and never fade out: a transition is declared only for the screen, the card turn and the \"assigned\" state, never on a resting rule", () => {
  for (const rule of styleRules.filter(item => /transition\s*:/.test(item.body))) {
    // the screen itself (it fades in when inserted, and is removed, not faded, when it ends), the card turn, and the three that appear in "assigned"
    const entering = /\[data-phase="assigned"\]/.test(rule.prelude) || /^\.neotokyo-assign-b__card-inner/.test(rule.prelude) || /^\.neotokyo-sequence__screen\.neotokyo-assign-b:where/.test(rule.prelude);
    assert.ok(entering, `a transition on a resting rule: ${rule.prelude.slice(0, 80)}`);
  }
  // the face, the name and the cards fade in when the phase becomes "assigned"
  for (const name of ["portrait", "who", "cards"]) {
    const rule = styleRules.find(item => item.prelude.startsWith(`.neotokyo-assign-b[data-phase="assigned"] .neotokyo-assign-b__${name}`));
    assert.ok(rule && /transition:opacity/.test(rule.body), name);
  }
});

test("reduced motion, more contrast and forced colors are answered", () => {
  const contexts = new Set(styleRules.map(rule => rule.context));
  for (const media of ["@media(prefers-reduced-motion:reduce)", "@media(prefers-contrast:more)", "@media(forced-colors:active)", "@media(max-width:760px)", "@media(max-height:520px)"]) {
    assert.ok(contexts.has(media), `no ${media} block`);
  }
  const reduced = styleRules.filter(rule => rule.context === "@media(prefers-reduced-motion:reduce)");
  assert.ok(reduced.some(rule => /animation:none/.test(rule.body)) && reduced.some(rule => /transition:none/.test(rule.body)));
});

test("the round portrait shows the top of a tall image (one fixed position, 1.25 times from the top, no per-image adjustment)", () => {
  const rule = styleRules.find(item => item.prelude.startsWith(".neotokyo-assign-b__portrait img"));
  assert.ok(rule, "no rule for the portrait image");
  assert.match(rule.body, /object-fit:cover/);
  assert.match(rule.body, /object-position:50% 6%/);
  assert.match(rule.body, /transform:scale\(1\.25\);transform-origin:50% 6%/);
});

test("the name has the full width under both columns, the handle and the name in a line each", () => {
  const who = styleRules.find(item => item.prelude.startsWith(".neotokyo-assign-b__who"));
  assert.ok(who);
  const main = styleRules.find(item => item.prelude.startsWith(".neotokyo-assign-b__main"));
  assert.match(main.body, /grid-template-columns:minmax\(150px,30%\) minmax\(0,1fr\)/);
  // the name block is a child of the screen, not of the narrow left column
  for (const name of ["handle", "real"]) {
    const rule = styleRules.find(item => item.prelude.startsWith(`.neotokyo-assign-b__${name}`));
    assert.match(rule.body, /-webkit-line-clamp:2/);
  }
});

test("the screen is built by its own module with its own class names; the sequence builds it before touching anything and plays it only through playWithFallback", async () => {
  const builder = await read("../js/act-showcase-assign-b.js");
  const classes = new Set([...builder.matchAll(/element\("\w+", ["'`]([^"'`$]+)/g)].flatMap(match => match[1].split(" ")));
  for (const name of classes) assert.ok(name === "neotokyo-sequence__screen" || name.startsWith("neotokyo-assign-b"), name);
  assert.doesNotMatch(builder, /screen--linked|handout-panel|assign-panel|cast--linked|neotokyo-style-card|neotokyo-story__|UNREGISTERED/);
  // the builder gets createCastImage handed in: importing act-showcase-neotokyo.js from it would be a cycle
  assert.doesNotMatch(builder, /act-showcase-neotokyo/);
  const neotokyo = await readFile(new URL("../js/act-showcase-neotokyo.js", import.meta.url), "utf8");
  const show = neotokyo.slice(neotokyo.indexOf("async function showHandoutAssignB("), neotokyo.indexOf("function createHandoutHeading("));
  assert.ok(show.indexOf("createAssignScreenB(") < show.indexOf("setProgress("));
  assert.match(show, /markScene\(screen, scene, "b"\)/);
  assert.match(show, /roleForCast\(cast\)/);
  assert.match(show, /waitForAdvance\(state, `ASSIGN \/\/ PC\$\{pcNumber\}`\)/);
  assert.match(neotokyo, /patterns: Object\.freeze\(\{ a: showHandoutsAndAssigns, b: showHandoutAssignsB \}\)/);
  // every wait of the sequence goes through wait(), which a skip ends at once (no window.setTimeout of its own)
  assert.doesNotMatch(show, /setTimeout/);
  // the state of the screen is the two attributes in this order
  const phases = [...show.matchAll(/dataset\.phase = "(\w+)"/g)].map(match => match[1]);
  assert.deepEqual(phases, ["read", "searching", "found", "assigned"]);
  assert.deepEqual([...show.matchAll(/dataset\.flip = "(\w+)"/g)].map(match => match[1]), ["running", "done"]);
});
