import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { actShowcaseSources } from "./helpers/act-showcase-css.mjs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const bootstrap = read("js/act-showcase-bootstrap.js");
const cue = read("js/act-showcase-scroll-cue.js");
const enhancer = read("js/act-showcase-finale-enhancer.js");
const css = actShowcaseSources().map(source => source.text).join("\n");

test("scroll cue module marks only a screen that really scrolls and still has room below", () => {
  assert.match(bootstrap, /act-showcase-scroll-cue\.js\?v=\d+/);
  assert.match(cue, /neotokyo-sequence__screen--linked\.is-splitting/);
  assert.match(cue, /\(auto\|scroll\)/);
  assert.match(cue, /scrollHeight - screen\.clientHeight - screen\.scrollTop > ROOM/);
  assert.match(cue, /data-scroll-cue/);
  assert.match(cue, /addEventListener\("scroll"/);
});

test("scroll cue is a fade plus a down arrow, kept still for reduced motion", () => {
  assert.match(css, /is-splitting\[data-scroll-cue\]:after\{content:"\\25BC"/);
  assert.match(css, /@keyframes act-showcase-scroll-cue/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\s*\.cinematic-intro\.neotokyo-sequence \.neotokyo-sequence__screen--linked\.is-splitting\[data-scroll-cue\]:after\{animation:none\}/);
  assert.match(css, /body\.showcase-neotokyo-reduced \.cinematic-intro\.neotokyo-sequence \.neotokyo-sequence__screen--linked\.is-splitting\[data-scroll-cue\]:after\{animation:none\}/);
  assert.doesNotMatch(css.match(/is-splitting\[data-scroll-cue\]:after\{[^}]*\}/)[0], /!important/);
});

test("PC badge sits in front of the cast name, at 10px or larger", () => {
  assert.match(enhancer, /summary-cast-body h3/);
  assert.match(enhancer, /nameRow\.dataset\.pc = `PC\$\{index \+ 1\}`/);
  const badge = css.match(/summary-cast-body h3\[data-pc\]:before\{[^}]*\}/);
  assert.ok(badge, "badge rule on the name heading");
  assert.match(badge[0], /content:attr\(data-pc\)/);
  assert.match(badge[0], /display:inline-block/);
  const size = Number(badge[0].match(/font:\s*\d+\s+(\d+(?:\.\d+)?)px/)?.[1]);
  assert.ok(size >= 10, `badge font ${size}px`);
  assert.doesNotMatch(css, /neotokyo-finale__cast-card:before/);
});

test("assignment reveal scrolls with rAF, once, and never against the reader", () => {
  assert.match(bootstrap, /act-showcase-scroll-cue\.js\?v=2/);
  assert.match(cue, /const REVEAL_MS = 800/);
  assert.match(cue, /classList\.contains\("is-assigned"\) && !revealed\.has\(screen\)/);
  assert.match(cue, /neotokyo-sequence__link-bridge/);
  assert.match(cue, /requestAnimationFrame\(stepReveal\)/);
  assert.match(cue, /screen\.scrollTop = job\.from \+ \(job\.to - job\.from\) \* eased/);
  assert.doesNotMatch(cue, /scrollTo\(|scrollIntoView|behavior: ?"smooth"|scroll-behavior/);
  // Stops: reader's hand, reduced motion, skipped/finished intro, advancing, a screen that does not scroll.
  for (const type of ["touchstart", "wheel", "pointerdown"]) assert.match(cue, new RegExp(`"${type}"`));
  assert.match(cue, /manual\.has\(screen\) \|\| reduced\(\) \|\| finished\(\)/);
  assert.match(cue, /showcase-neotokyo-reduced/);
  assert.match(cue, /aria-hidden"\) === "true"/);
  assert.match(cue, /addEventListener\("click"/);
  assert.match(cue, /\^\(auto\|scroll\)\$/);
  assert.match(cue, /if \(maxTop <= ROOM\) return/);
});

test("phone opening stacks the credit chips and the tagline block instead of overlapping them", () => {
  const phone = css.slice(css.indexOf("/* Opening: the credit chips"));
  assert.match(phone, /\.poster-v2-aside\{position:relative;top:auto;right:auto;bottom:auto/);
  assert.match(phone, /\.opening-ruler\{max-width:calc\(100% - 8px\);white-space:normal;overflow-wrap:anywhere\}/);
  assert.match(phone, /\.poster-v2-aside strong[^{]*\{font-size:max\(10px,\.57rem\)\}/);
  assert.doesNotMatch(phone, /!important/);
});
