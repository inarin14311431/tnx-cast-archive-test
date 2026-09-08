import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("presentation tuning loads after supporting cast styling", async () => {
  const html = await read("act-showcase.html");
  const supporting = html.indexOf("act-showcase-supporting-cast.css");
  const tuning = html.indexOf("act-showcase-presentation-tuning.css");
  assert.ok(supporting >= 0 && tuning > supporting);
});

test("title screen stays decorated while targeting about seventy percent of the viewport", async () => {
  const css = await read("css-next/pages/act-showcase-presentation-tuning.css");
  assert.match(css, /max-width:70vw;width:70vw/);
  assert.match(css, /font-size:clamp\(5\.8rem,7vw,9rem\)/);
  assert.match(css, /text-shadow:4px 0 0/);
  assert.match(css, /repeating-linear-gradient/);
  assert.doesNotMatch(css, /!important/);
});

test("trailer keeps adaptive typography and the frame follows content height", async () => {
  const tuning = await read("css-next/pages/act-showcase-presentation-tuning.css");
  const writing = await read("css-next/pages/act-showcase-writing-patterns.css");
  assert.match(writing, /data-trailer-pattern=\"prose\"/);
  assert.match(writing, /font-size:clamp\(\.88rem,1\.12vw,1\.08rem\)/);
  assert.match(writing, /white-space:pre-wrap/);
  assert.match(tuning, /screen--trailer\{height:auto;max-height:100%;align-self:center\}/);
  assert.match(tuning, /screen--trailer \.neotokyo-sequence__readout\{flex:0 1 auto;height:auto;min-height:4\.8em;max-height:calc\(100svh - 390px\);overflow:auto\}/);
});

test("the selected handout style is enlarged while duplicate matches stay secondary", async () => {
  const css = await read("css-next/pages/act-showcase-presentation-tuning.css");
  const supporting = await read("css-next/pages/act-showcase-supporting-cast.css");
  assert.match(css, /cast--linked \.neotokyo-sequence__styles span\.is-role-primary\{[^}]*font-size:clamp\(\.72rem,1vw,\.96rem\)/);
  assert.match(css, /transform:translateY\(-2px\) scale\(1\.08\)/);
  assert.match(css, /poster-v2-tags span\.is-assigned-style\{[^}]*font-size:\.72rem/);
  assert.match(supporting, /is-assigned-style-duplicate\{opacity:\.45\}/);
});

test("guest files use a left and right two-column layout on desktop", async () => {
  const css = await read("css-next/pages/act-showcase-presentation-tuning.css");
  assert.match(css, /poster-supporting-cast__grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /neotokyo-supporting-cast__rail\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:900px\)/);
});

test("guest taglines use Japanese corner brackets", async () => {
  const js = await read("js/act-showcase-supporting-cast.js");
  assert.match(js, /`「\$\{guest\.tagline\}」`/);
  assert.doesNotMatch(js, /`“\$\{guest\.tagline\}”`/);
});
