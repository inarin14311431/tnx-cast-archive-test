import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { countHardcodedColors } from "../scripts/hardcoded-colors-lib.mjs";
import { actShowcaseCss } from "./helpers/act-showcase-css.mjs";

// docs/ACT_SHOWCASE_SCENES.md §6 #7 (4th pattern: title C) / §4: the CSS of the ACT TRAILER pattern C (css-next/pages/act-showcase-patterns.css,
// source act-showcase-pattern-title-c.css). It styles only its own screen: every rule is scoped to
// [data-scene="title"][data-scene-pattern="c"] with :where(), uses class names of its own, and takes its colors from the
// theme variables (a new showcase stylesheet has no hardcoded color; audit:showcase-colors holds the same line).
const MARK = '[data-scene="title"][data-scene-pattern="c"]';
const SCOPE = `:where(${MARK},${MARK} *)`;
const css = actShowcaseCss("act-showcase-pattern-title-c");
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

test("the title pattern C source has rules", () => {
  assert.ok(styleRules.length >= 20, `${styleRules.length} rules`);
});

test("every rule is scoped to pattern C of the title frame, so nothing outside that screen is styled", () => {
  for (const rule of styleRules) {
    for (const selector of rule.prelude.split(/,(?![^(]*\))/).map(item => item.trim())) {
      assert.ok(selector.endsWith(SCOPE), `not scoped: ${selector}`);
    }
  }
});

test("only classes of its own are styled; pattern A's hooks and the observers' targets are never named", () => {
  const classes = new Set(css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/:where\([^)]*\)/g, "").match(/\.[A-Za-z_][\w-]*/g)?.map(name => name.slice(1)));
  const shared = new Set(["neotokyo-sequence__screen", "is-visible"]);
  for (const name of classes) assert.ok(name.startsWith("neotokyo-title-c") || shared.has(name), `unexpected class: ${name}`);
  for (const forbidden of ["neotokyo-sequence__screen--title", "neotokyo-sequence__act-title", "neotokyo-sequence__ruler-credit", "neotokyo-title-logo__", "neotokyo-sequence__act-subtitle", "showcase-neotokyo-title-logo-active"]) {
    assert.ok(!css.includes(forbidden), `names ${forbidden}`);
  }
});

test("keyframes are named for the pattern", () => {
  assert.ok(keyframes.length >= 1);
  for (const rule of keyframes) assert.match(rule.prelude, /^@keyframes neotokyo-title-c-/);
});

test("colors come from the theme variables: no #hex, rgb() or hsl(), and every color-mix() mixes a --showcase-* variable", () => {
  const code = withoutComments(css);
  assert.equal(countHardcodedColors(css, "css"), 0);
  assert.doesNotMatch(code, /#[0-9a-f]{3,8}\b/i);
  for (const mix of code.match(/color-mix\([^;{}]*\)/g) || []) assert.match(mix, /var\(--showcase-[a-z-]+\)/, mix);
});

test("the screen is built by its own module with its own class names, and the loader plays it only through playWithFallback", async () => {
  const builder = withoutComments(await readFile(new URL("../js/act-showcase-title-c.js", import.meta.url), "utf8"));
  const classes = new Set([...builder.matchAll(/(?:element\("\w+", |className = )["'`]([^"'`$]+)/g)].flatMap(match => match[1].split(" ")));
  for (const name of classes) assert.ok(name === "neotokyo-sequence__screen" || name.startsWith("neotokyo-title-c"), name);
  assert.doesNotMatch(builder, /screen--title|__act-title|__ruler-credit|neotokyo-title-logo|__act-subtitle/);
  const neotokyo = await readFile(new URL("../js/act-showcase-neotokyo.js", import.meta.url), "utf8");
  const showActTitleC = neotokyo.slice(neotokyo.indexOf("async function showActTitleC("), neotokyo.indexOf("async function showTrailer("));
  // the screen is built first: a failure there happens before progress, DOM or timers are touched
  assert.ok(showActTitleC.indexOf("createTitleScreenC(") < showActTitleC.indexOf("setProgress("));
  assert.match(showActTitleC, /markScene\(screen, scene, "c"\)/);
  assert.match(showActTitleC, /waitForAdvance\(state, "NEXT \/\/ ACT TRAILER"\)/);
  assert.match(neotokyo, /patterns: Object\.freeze\(\{ a: showActTitle, b: showActTitleB, c: showActTitleC \}\)/);
});

test("the track start: short names start wide, long ones start close, never outside the limits", async () => {
  const { titleTrackStart, TITLE_TRACK_MAX, TITLE_TRACK_MIN } = await import("../js/act-showcase-title-c.js");
  assert.equal(titleTrackStart("夜明け"), TITLE_TRACK_MAX);
  assert.equal(titleTrackStart(""), TITLE_TRACK_MAX);
  const long = titleTrackStart("夜明けを駆ける者たちと、消えた都市の記憶を追う長い一夜の物語 NEON AFTERIMAGE");
  assert.ok(long >= TITLE_TRACK_MIN && long <= 0.12, String(long));
  const middle = titleTrackStart("夜明けを駆ける者たちと、終わらない都市の物語");
  assert.ok(middle > TITLE_TRACK_MIN && middle < TITLE_TRACK_MAX, String(middle));
});

test("no pseudo-element is used (the :where() scope must be last), and the aperture line is an element of its own", () => {
  assert.doesNotMatch(withoutComments(css), /::?(?:before|after)/);
  assert.match(css, /\.neotokyo-title-c__flare/);
});

test("reduced motion shows the final state at once; high contrast and forced colors drop the light and the glow", () => {
  const reduce = all.filter(rule => /prefers-reduced-motion/.test(rule.context));
  assert.ok(reduce.some(rule => /animation:none/.test(rule.body)));
  assert.ok(reduce.some(rule => /flare/.test(rule.prelude) && /display:none/.test(rule.body)));
  assert.ok(all.some(rule => /prefers-contrast:\s*more/.test(rule.context) && /flare/.test(rule.prelude)));
  assert.ok(all.some(rule => /forced-colors:\s*active/.test(rule.context) && /CanvasText/.test(rule.body)));
});

test("pattern C does not import another pattern's module, and keeps the default subtitle out", async () => {
  const source = await readFile(new URL("../js/act-showcase-title-c.js", import.meta.url), "utf8");
  assert.doesNotMatch(withoutComments(source), /from\s+["']\.\/act-showcase-title-b\.js/);
  const { meaningfulSubtitle } = await import("../js/act-showcase-title-c.js");
  assert.equal(meaningfulSubtitle("CAST SHOWCASE"), "");
  assert.equal(meaningfulSubtitle("  cast showcase "), "");
  assert.equal(meaningfulSubtitle("  夜明け  前の   物語 "), "夜明け 前の 物語");
  assert.equal(meaningfulSubtitle(undefined), "");
});
