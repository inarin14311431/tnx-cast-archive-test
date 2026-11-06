import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { countHardcodedColors } from "../scripts/hardcoded-colors-lib.mjs";
import { actShowcaseCss } from "./helpers/act-showcase-css.mjs";

// docs/ACT_SHOWCASE_SCENES.md §6 #7 (3rd pattern: ready) / §4: the CSS of the ACT READY pattern B (css-next/pages/act-showcase-patterns.css,
// source act-showcase-pattern-ready-b.css). It styles only its own screen: every rule is scoped to
// [data-scene="ready"][data-scene-pattern="b"] with :where(), uses class names of its own, and takes its colors from the
// theme variables (a new showcase stylesheet has no hardcoded color; audit:showcase-colors holds the same line).
const MARK = '[data-scene="ready"][data-scene-pattern="b"]';
const SCOPE = `:where(${MARK},${MARK} *)`;
const css = actShowcaseCss("act-showcase-pattern-ready-b");
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

test("the ready pattern B source has rules", () => {
  assert.ok(styleRules.length >= 20, `${styleRules.length} rules`);
});

test("every rule is scoped to pattern B of the ready frame, so nothing outside that screen is styled", () => {
  for (const rule of styleRules) {
    for (const selector of rule.prelude.split(/,(?![^(]*\))/).map(item => item.trim())) {
      assert.ok(selector.endsWith(SCOPE), `not scoped: ${selector}`);
    }
  }
});

test("only classes of its own are styled; pattern A's hooks and the observers' targets are never named", () => {
  const classes = new Set(css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/:where\([^)]*\)/g, "").match(/\.[A-Za-z_][\w-]*/g)?.map(name => name.slice(1)));
  const shared = new Set(["neotokyo-sequence__screen", "is-visible"]);
  for (const name of classes) assert.ok(name.startsWith("neotokyo-ready-b") || shared.has(name), `unexpected class: ${name}`);
  for (const forbidden of ["neotokyo-sequence__screen--summary", "neotokyo-sequence__summary-", "neotokyo-sequence__act-ready", "neotokyo-finale__", "neotokyo-supporting-cast", "showcase-neotokyo-finale-active"]) {
    assert.ok(!css.includes(forbidden), `names ${forbidden}`);
  }
});

test("keyframes are named for the pattern", () => {
  assert.ok(keyframes.length >= 1);
  for (const rule of keyframes) assert.match(rule.prelude, /^@keyframes neotokyo-ready-b-/);
});

test("colors come from the theme variables: no #hex, rgb() or hsl(), and every color-mix() mixes a --showcase-* variable", () => {
  const code = withoutComments(css);
  assert.equal(countHardcodedColors(css, "css"), 0);
  assert.doesNotMatch(code, /#[0-9a-f]{3,8}\b/i);
  for (const mix of code.match(/color-mix\([^;{}]*\)/g) || []) assert.match(mix, /var\(--showcase-[a-z-]+\)/, mix);
});

test("the screen is built by its own module with its own class names, and the loader plays it only through playWithFallback", async () => {
  const builder = withoutComments(await readFile(new URL("../js/act-showcase-ready-b.js", import.meta.url), "utf8"));
  const classes = new Set([...builder.matchAll(/element\("\w+", ["'`]([^"'`$]+)/g)].flatMap(match => match[1].split(" ")));
  for (const name of classes) assert.ok(name === "neotokyo-sequence__screen" || name.startsWith("neotokyo-ready-b"), name);
  assert.doesNotMatch(builder, /screen--summary|summary-cast|__act-ready|neotokyo-finale__|neotokyo-supporting-cast/);
  const neotokyo = await readFile(new URL("../js/act-showcase-neotokyo.js", import.meta.url), "utf8");
  const showReadyB = neotokyo.slice(neotokyo.indexOf("async function showReadyB("), neotokyo.indexOf("function createSummaryRuler("));
  // the screen is built first: a failure there happens before progress, DOM or timers are touched
  assert.ok(showReadyB.indexOf("createReadyScreenB(") < showReadyB.indexOf("setProgress("));
  assert.match(showReadyB, /markScene\(screen, scene, "b"\)/);
  assert.match(showReadyB, /waitForAdvance\(state, "OPEN FULL SHOWCASE"\)/);
  assert.match(neotokyo, /patterns: Object\.freeze\(\{ a: showSummary, b: showReadyB \}\)/);
  // the builder gets createCastImage handed in: importing act-showcase-neotokyo.js from it would be a cycle
  assert.doesNotMatch(builder, /act-showcase-neotokyo/);
});

test("ACT READY B: a click anywhere on the stage is NEXT, and the handle and the name are two spans side by side", async () => {
  const neotokyo = await readFile(new URL("../js/act-showcase-neotokyo.js", import.meta.url), "utf8");
  assert.doesNotMatch(neotokyo, /data-advance-guard/);
  const builder = await readFile(new URL("../js/act-showcase-ready-b.js", import.meta.url), "utf8");
  assert.doesNotMatch(builder, /advanceGuard/);
  assert.match(builder, /neotokyo-ready-b__handle/);
  assert.match(builder, /neotokyo-ready-b__real/);
});

test("guests and the role label: from the model, nothing drawn for what is missing", async () => {
  const { readyRole, normalizeReadyGuests, createReadyScreenB } = await import("../js/act-showcase-ready-b.js");
  assert.equal(readyRole({}), "");
  assert.equal(readyRole({ participationRole: " カブキ " }), "カブキ");
  assert.equal(readyRole({ styles: [{ label: "A", handoutRole: false }, { label: "カゼ●", handoutRole: true }] }), "カゼ●");
  assert.deepEqual(normalizeReadyGuests(null), []);
  assert.deepEqual(normalizeReadyGuests([{ handle: "", name: "" }, { handle: "ゲスト", name: " 協力者  K " }, { name: "名前だけ" }]).map(name => name.replace(/[“”"]/g, "")), ["ゲスト 協力者 K", "名前だけ"]);
  const page = await readFile(new URL("../js/act-showcase-page.js", import.meta.url), "utf8");
  assert.match(page, /model\.scenes\.ready === "b"\) model\.guests = await loadReadyGuests\(slug\)/);
  assert.match(page, /guests: \[\],/);
  assert.equal(typeof createReadyScreenB, "function");
});

test("the round portraits show the top of a tall image (one fixed position, no per-image adjustment)", () => {
  const rule = styleRules.find(item => item.prelude.startsWith(".neotokyo-ready-b__image img"));
  assert.ok(rule, "no rule for the portrait image");
  assert.match(rule.body, /object-fit:cover/);
  assert.match(rule.body, /object-position:50% 6%/);
  // zoomed 1.25 times from the top: the face of a tall full-body image comes to the upper middle of the circle (1.5 cuts heads)
  assert.match(rule.body, /transform:scale\(1\.25\);transform-origin:50% 6%/);
});
