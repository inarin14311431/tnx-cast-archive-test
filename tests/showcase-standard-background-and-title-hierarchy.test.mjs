import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("theme surface rule for the standard page no longer resets the background shorthand's other layers to their initial values", async () => {
  const surface = await read("css-next/pages/act-showcase-theme-surface-system.css");
  // :root[data-showcase-theme] #act-showcase-standard-page{...} uses the `background` shorthand for
  // its own gradient wash, which implicitly resets every sub-property it doesn't mention (size,
  // position, attachment, repeat) to their initial values. Its ID selector outranks
  // act-showcase-standard.css's bare `body` selector, so those implicit resets always won while
  // data-showcase-theme is set (which is always, per js/act-showcase-theme-runtime.js's default).
  // Confirmed live: without these, document.body.style.backgroundImage (the actual cityscape photo,
  // set inline by js/act-showcase-standard.js) rendered at its native size pinned to the top-left
  // instead of covering the viewport.
  const rule = surface.slice(surface.indexOf(":root[data-showcase-theme] #act-showcase-standard-page{"), surface.indexOf("}", surface.indexOf(":root[data-showcase-theme] #act-showcase-standard-page{")));
  assert.match(rule, /background-repeat:no-repeat/);
  assert.match(rule, /background-size:cover/);
  assert.match(rule, /background-position:center top/);
  assert.match(rule, /background-attachment:fixed/);
});

test("standard showcase hero promotes the act's own title over the generic ACT CAST FILE label", async () => {
  const css = await read("css-next/pages/act-showcase-standard.css");
  // .hero h1 (#showcase-title, "ACT CAST FILE" by default) used to be the largest, glowing headline
  // while .hero__act (#showcase-act-name, the act's actual title) was tiny — backwards from what the
  // content actually needs highlighted. .hero__act now takes over the large clamp() + glow that
  // .hero h1 used to own; .hero h1 becomes a restrained label near .hero__code's size; .hero h1 span
  // (the subtitle) gets its own clamp() sized independently of the now-small h1 instead of an `em`
  // value relative to it. HTML structure is unchanged (this file only).
  assert.match(css, /\.hero__act\{[^}]*font:900 clamp\(2\.7rem,8vw,7\.3rem\)\/\.86 Orbitron,sans-serif[^}]*text-shadow:0 0 32px rgba\(0,239,255,\.3\)/);
  assert.match(css, /\.hero h1\{[^}]*font:800 \.88rem/);
  assert.doesNotMatch(css, /\.hero h1\{[^}]*clamp\(2\.7rem,8vw,7\.3rem\)/);
  assert.doesNotMatch(css, /\.hero__act\{[^}]*clamp\(1rem,2vw,1\.45rem\)/);
  // The subtitle's font-size must not stay a fraction of h1's own (now tiny) size, or it would
  // shrink along with it.
  assert.match(css, /\.hero h1 span\{[^}]*font-size:clamp\(1\.05rem,2\.6vw,2\.05rem\)/);
  assert.doesNotMatch(css, /\.hero h1 span\{[^}]*font-size:\.38em/);
});
