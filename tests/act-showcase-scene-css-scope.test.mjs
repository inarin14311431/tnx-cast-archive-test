import test from "node:test";
import assert from "node:assert/strict";
import { actShowcaseCss } from "./helpers/act-showcase-css.mjs";
import { SCENE_FRAMES } from "../js/act-showcase-scenes.js";

// docs/ACT_SHOWCASE_SCENES.md §6 #5a / §6.1-5: the CSS of pattern A stays inside pattern A. A source layer that styles
// a single scene frame has every selector end in :where(M, M *), M = [data-scene=frame][data-scene-pattern="a"]
// (the screen itself or anything inside it). :where() adds no specificity and the rules keep their place in the
// bundle, so for the elements of that frame the cascade is unchanged; outside the frame (a pattern B/C screen,
// another frame) the rules no longer apply.
// A layer that styles several frames (frames: [...]) is split into one rule per frame, each scoped to its own frame;
// every selector carries exactly one of the listed scopes and every listed frame is used.
// unscoped: rules whose subject is the page itself (body) or a part of the sequence overlay that holds every screen
// (its shell, stage or footer, outside the frames' sections), which no single frame owns; listed one by one so a new
// unscoped selector fails the test
const SCOPED_SOURCES = [
  { source: "act-showcase-assign-cards", frame: "handout-assign" },
  { source: "act-showcase-assign-cards-theme", frame: "handout-assign" },
  { source: "act-showcase-poster-v2", frame: "finale", unscoped: ["body.showcase-poster-v2-ready", "body.showcase-poster-v2-ready:after"] },
  { source: "act-showcase-cast-selector", frame: "finale" },
  { source: "act-showcase-ornament", frame: "finale" },
  { source: "act-showcase-ornament-plus", frame: "finale" },
  { source: "act-showcase-top-background-only", frame: "finale" },
  { source: "act-showcase-final-trailer", frame: "finale" },
  { source: "act-showcase-cinematic-fit", frames: ["title", "handout-assign", "ready", "finale"] },
  {
    source: "act-showcase-visual-trailer-fix",
    frames: ["trailer", "finale"],
    unscoped: ["body#act-showcase-page .cinematic-intro.neotokyo-sequence .neotokyo-sequence__stage:has(> .neotokyo-sequence__screen--trailer.is-visible)"]
  },
  { source: "act-showcase-title-cyberpunk", frames: ["title", "finale"] },
  { source: "act-showcase-presentation-tuning", frames: ["title", "ready", "finale"] },
  { source: "act-showcase-writing-patterns", frames: ["title", "trailer", "handout-assign"] },
  { source: "act-showcase-followup-v1", frames: ["handout-assign", "finale"] },
  {
    source: "act-showcase-visual-emphasis",
    frames: ["trailer", "handout-assign", "finale"],
    // the trailer's document scroll switches the page, the overlay, its shell and stage; the ACT READY access
    // button lives in the sequence footer, outside the ready screen
    unscoped: [
      ":root[data-showcase-theme] body#act-showcase-page.showcase-neotokyo-intro-active.showcase-trailer-document-scroll",
      ":root[data-showcase-theme] body#act-showcase-page.showcase-trailer-document-scroll .cinematic-intro.neotokyo-sequence",
      ":root[data-showcase-theme] body#act-showcase-page.showcase-trailer-document-scroll .cinematic-intro.neotokyo-sequence .neotokyo-sequence__shell",
      ":root[data-showcase-theme] body#act-showcase-page.showcase-trailer-document-scroll .cinematic-intro.neotokyo-sequence .neotokyo-sequence__stage.is-trailer-scroll",
      ":root[data-showcase-theme] body#act-showcase-page.showcase-trailer-document-scroll .cinematic-intro.neotokyo-sequence .neotokyo-sequence__stage.is-trailer-scroll:before",
      "body#act-showcase-page.showcase-neotokyo-finale-active .neotokyo-finale__access-button strong.neotokyo-finale__access-title",
      "body#act-showcase-page.showcase-neotokyo-finale-active .neotokyo-finale__access-button strong .neotokyo-finale__access-title-line",
      "body#act-showcase-page.showcase-neotokyo-finale-active .neotokyo-finale__access-button strong .neotokyo-finale__access-title-line + .neotokyo-finale__access-title-line"
    ]
  }
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

for (const { source, frame, frames = [frame], unscoped = [] } of SCOPED_SOURCES) {
  test(`${source}: every selector is confined to one frame of pattern a (${frames.join(", ")})`, () => {
    for (const item of frames) assert.ok(SCENE_FRAMES.includes(item), item);
    const scopes = frames.map(scopeOf);
    const selectors = selectorsOf(actShowcaseCss(source));
    assert.ok(selectors.length > 0);
    const left = selectors.filter(selector => !scopes.some(scope => selector.includes(scope)));
    assert.deepEqual([...new Set(left)].sort(), [...unscoped].sort(), "only the listed page-level selectors stay unscoped");
    const used = new Set();
    for (const selector of selectors.filter(item => !left.includes(item))) {
      const own = scopes.filter(scope => selector.includes(scope));
      assert.equal(own.length, 1, `one frame per selector: ${selector}`);
      used.add(own[0]);
      // the scope sits on the subject compound: only pseudo-elements may follow it
      assert.match(selector.replaceAll(own[0], "\u0000"), /\u0000(?:::?(?:before|after|first-line|first-letter|placeholder|marker))*$/, selector);
    }
    assert.deepEqual([...used].sort(), [...scopes].sort(), "every listed frame is used");
  });
}
