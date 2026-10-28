import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { countHardcodedColors } from "../scripts/hardcoded-colors-lib.mjs";
import { actShowcaseCss } from "./helpers/act-showcase-css.mjs";

// docs/ACT_SHOWCASE_SCENES.md §6 #7 / §4: the CSS of the ACT TRAILER pattern B (css-next/pages/act-showcase-patterns.css,
// source act-showcase-pattern-trailer-b.css). It styles only its own screen: every rule is scoped to
// [data-scene="trailer"][data-scene-pattern="b"] with :where(), uses class names of its own, and takes its colors from the
// theme variables (a new showcase stylesheet has no hardcoded color; audit:showcase-colors holds the same line).
const MARK = '[data-scene="trailer"][data-scene-pattern="b"]';
const SCOPE = `:where(${MARK},${MARK} *)`;
const css = actShowcaseCss("act-showcase-pattern-trailer-b");
const withoutComments = text => text.replace(/\/\*[\s\S]*?\*\/|(^|[\s;{}])\/\/[^\n]*/g, "$1");

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

test("the pattern B source is the last stylesheet source and has rules", () => {
  assert.ok(styleRules.length >= 20, `${styleRules.length} rules`);
});

test("every rule is scoped to pattern B of the trailer frame, so nothing outside that screen is styled", () => {
  for (const rule of styleRules) {
    for (const selector of rule.prelude.split(/,(?![^(]*\))/).map(item => item.trim())) {
      assert.ok(selector.endsWith(SCOPE), `not scoped: ${selector}`);
    }
  }
});

test("only classes of its own are styled; pattern A's hooks and the observers' targets are never named", () => {
  const classes = new Set(css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/:where\([^)]*\)/g, "").match(/\.[A-Za-z_][\w-]*/g)?.map(name => name.slice(1)));
  const shared = new Set(["neotokyo-sequence__screen", "neotokyo-sequence__readout-read", "neotokyo-sequence__readout-unread", "is-visible", "is-placeholder"]);
  for (const name of classes) assert.ok(name.startsWith("neotokyo-trailer-b") || shared.has(name), `unexpected class: ${name}`);
  for (const forbidden of ["neotokyo-sequence__screen--trailer", "neotokyo-sequence__readout ", "neotokyo-sequence__trailer-terminal", "neotokyo-sequence__terminal-bar", "is-terminal-readout", "neotokyo-story__trailer-outro", "is-trailer-scroll", "showcase-trailer-document-scroll", "data-trailer-pattern"]) {
    assert.ok(!css.includes(forbidden), `names ${forbidden}`);
  }
});

test("keyframes are named for the pattern", () => {
  assert.ok(keyframes.length >= 1);
  for (const rule of keyframes) assert.match(rule.prelude, /^@keyframes neotokyo-trailer-b-/);
});

test("colors come from the theme variables: no #hex, rgb() or hsl(), and every color-mix() mixes a --showcase-* variable", () => {
  const code = withoutComments(css);
  assert.equal(countHardcodedColors(css, "css"), 0);
  assert.doesNotMatch(code, /#[0-9a-f]{3,8}\b/i);
  for (const mix of code.match(/color-mix\([^;{}]*\)/g) || []) assert.match(mix, /var\(--showcase-[a-z-]+\)/, mix);
});

test("the screen is built by its own module with its own class names, and the loader plays it only through playWithFallback", async () => {
  const builder = withoutComments(await readFile(new URL("../js/act-showcase-trailer-b.js", import.meta.url), "utf8"));
  const classes = new Set([...builder.matchAll(/className = ["'`]([^"'`$]+)/g)].flatMap(match => match[1].split(" ")));
  for (const name of classes) assert.ok(name === "neotokyo-sequence__screen" || name.startsWith("neotokyo-trailer-b"), name);
  assert.doesNotMatch(builder, /screen--trailer|neotokyo-sequence__readout\b|trailer-terminal|is-trailer-scroll/);
  const neotokyo = await readFile(new URL("../js/act-showcase-neotokyo.js", import.meta.url), "utf8");
  const showTrailerB = neotokyo.slice(neotokyo.indexOf("async function showTrailerB("), neotokyo.indexOf("async function showHandoutAndAssign("));
  // the screen is built first: a failure there happens before progress, DOM or timers are touched
  assert.ok(showTrailerB.indexOf("createTrailerScreenB(") < showTrailerB.indexOf("setProgress("));
  assert.match(showTrailerB, /markScene\(screen, scene, "b"\)/);
  assert.match(showTrailerB, /typeSplitReadout\(state, readout, 4200, 34, \(\) => keepCaretVisible\(body, readout\.readText\)\)/);
});
