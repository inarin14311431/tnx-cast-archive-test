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

test("title screen is intentionally oversized and decorated", async () => {
  const css = await read("css-next/pages/act-showcase-presentation-tuning.css");
  assert.match(css, /font-size:clamp\(7\.4rem,11\.5vw,15rem\)/);
  assert.match(css, /text-shadow:5px 0 0/);
  assert.match(css, /repeating-linear-gradient/);
  assert.doesNotMatch(css, /!important/);
});

test("trailer typography does not shrink after typewriter classification", async () => {
  const css = await read("css-next/pages/act-showcase-presentation-tuning.css");
  assert.match(css, /screen--trailer \.neotokyo-sequence__readout\{font-size:clamp\(1\.08rem,1\.42vw,1\.34rem\);transition:none\}/);
  assert.match(css, /data-trailer-pattern=\"prose\"/);
  assert.match(css, /font-size:clamp\(1\.08rem,1\.42vw,1\.34rem\)/);
});

test("guest files expand to available width", async () => {
  const css = await read("css-next/pages/act-showcase-presentation-tuning.css");
  assert.match(css, /neotokyo-supporting-cast__rail\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(280px,1fr\)\)/);
  assert.match(css, /poster-supporting-card\{grid-template-columns:150px minmax\(0,1fr\);min-height:232px\}/);
});

test("guest taglines use Japanese corner brackets", async () => {
  const js = await read("js/act-showcase-supporting-cast.js");
  assert.match(js, /`「\$\{guest\.tagline\}」`/);
  assert.doesNotMatch(js, /`“\$\{guest\.tagline\}”`/);
});
