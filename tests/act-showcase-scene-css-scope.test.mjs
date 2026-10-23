import test from "node:test";
import assert from "node:assert/strict";
import { actShowcaseCss } from "./helpers/act-showcase-css.mjs";
import { SCENE_FRAMES } from "../js/act-showcase-scenes.js";

// docs/ACT_SHOWCASE_SCENES.md §6 #5a / §6.1-5: the CSS of pattern A stays inside pattern A. A source layer that styles
// a single scene frame has every selector end in :where(M, M *), M = [data-scene=frame][data-scene-pattern="a"]
// (the screen itself or anything inside it). :where() adds no specificity and the rules keep their place in the
// bundle, so for the elements of that frame the cascade is unchanged; outside the frame (a pattern B/C screen,
// another frame) the rules no longer apply.
const SCOPED_SOURCES = [
  { source: "act-showcase-assign-cards", frame: "handout-assign" },
  { source: "act-showcase-assign-cards-theme", frame: "handout-assign" }
];

const scopeOf = frame => {
  const marker = `[data-scene="${frame}"][data-scene-pattern="a"]`;
  return `:where(${marker},${marker} *)`;
};

// selectors of every style rule (not @keyframes steps), comments removed
function selectorsOf(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@(?:-webkit-)?keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  return [...text.matchAll(/(?:^|[{};])\s*([^{}@;]+)\{/g)]
    .flatMap(match => {
      const parts = [];
      let depth = 0, last = 0;
      const list = match[1];
      for (let index = 0; index < list.length; index += 1) {
        const character = list[index];
        if (character === "(" || character === "[") depth += 1;
        else if (character === ")" || character === "]") depth -= 1;
        else if (character === "," && depth === 0) { parts.push(list.slice(last, index)); last = index + 1; }
      }
      parts.push(list.slice(last));
      return parts;
    })
    .map(selector => selector.trim())
    .filter(Boolean);
}

for (const { source, frame } of SCOPED_SOURCES) {
  test(`${source}: every selector is confined to the ${frame} frame of pattern a`, () => {
    assert.ok(SCENE_FRAMES.includes(frame), frame);
    const scope = scopeOf(frame);
    const selectors = selectorsOf(actShowcaseCss(source));
    assert.ok(selectors.length > 0);
    for (const selector of selectors) {
      // the scope sits on the subject compound: only pseudo-elements may follow it
      assert.match(selector.replaceAll(scope, "\u0000"), /\u0000(?:::?(?:before|after|first-line|first-letter|placeholder|marker))*$/, selector);
    }
  });
}
