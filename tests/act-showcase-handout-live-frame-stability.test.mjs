import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const bootstrap = read("js/act-showcase-bootstrap.js");
const handoutFrame = read("js/act-showcase-handout-live-frame.js");
const handoutCss = read("css-next/pages/act-showcase-handout-live-frame.css");
const storyFlow = read("js/act-showcase-story-flow.js");
const scenarioWriter = read("js/act-showcase-scenario-writer.js");
const supportingCast = read("js/act-showcase-supporting-cast.js");
const finalTrailer = read("js/act-showcase-final-trailer.js");
const page = read("js/act-showcase-page.js");

test("HANDOUT readout grows with typed content and delegates viewport overflow to the stage", () => {
  assert.match(bootstrap, /act-showcase-handout-live-frame\.js\?v=1/);
  assert.ok(bootstrap.indexOf("act-showcase-trailer-live-frame.js") < bootstrap.indexOf("act-showcase-handout-live-frame.js"));
  assert.ok(bootstrap.indexOf("act-showcase-handout-live-frame.js") < bootstrap.indexOf("act-showcase-page.js"));
  assert.match(handoutFrame, /readout\.scrollHeight/);
  assert.match(handoutFrame, /readout\.style\.height = `\$\{targetHeight\}px`/);
  assert.match(handoutFrame, /readout\.style\.overflow = "visible"/);
  assert.match(handoutFrame, /stage\.classList\.add\("is-handout-scroll"\)/);
  assert.match(handoutFrame, /ResizeObserver/);
  assert.match(handoutFrame, /MutationObserver/);
  assert.doesNotMatch(handoutFrame, /scrollIntoView|window\.scrollBy/);
});

test("HANDOUT live sizing releases control when assignment split starts", () => {
  assert.match(handoutFrame, /!screen\.classList\.contains\("is-splitting"\)/);
  assert.match(handoutFrame, /stage\?\.classList\.remove\("is-handout-scroll"\)/);
  assert.match(handoutFrame, /releaseReadout\(activeReadout\)/);
  assert.match(handoutFrame, /readout\.style\.removeProperty\(property\)/);
});

test("HANDOUT CSS makes the stage the sole scroll owner before assignment", () => {
  assert.match(handoutCss, /\.neotokyo-sequence__stage\.is-handout-scroll\{[^}]*overflow-y:auto/);
  assert.match(handoutCss, /\.neotokyo-sequence__screen--linked:not\(\.is-splitting\)\{[^}]*height:auto[^}]*max-height:none[^}]*overflow:visible/);
  assert.match(handoutCss, /\.neotokyo-sequence__readout\{[^}]*max-height:none[^}]*overflow:visible/);
  assert.doesNotMatch(handoutCss, /\.is-splitting[^}]*overflow:visible/);
});

test("high-frequency typewriter text mutations no longer trigger full showcase decoration scans", () => {
  assert.match(scenarioWriter, /hasStructuralElementMutation/);
  assert.match(scenarioWriter, /node\.nodeType === Node\.ELEMENT_NODE/);
  assert.match(supportingCast, /hasStructuralElementMutation/);
  assert.match(supportingCast, /node\.nodeType === Node\.ELEMENT_NODE/);
  assert.match(storyFlow, /hasStructuralElementMutation/);
  assert.match(storyFlow, /hasLinkedScreenStateMutation/);
  assert.match(storyFlow, /attributeFilter: \["class"\]/);
  assert.match(storyFlow, /target\.matches\("\.neotokyo-sequence__screen--linked"\)/);
});

test("linked screen state changes remain observable after text churn is filtered", () => {
  assert.match(storyFlow, /sequence\.classList\.contains\("is-read"\)/);
  assert.match(storyFlow, /sequence\.classList\.contains\("is-assigned"\)/);
  assert.match(storyFlow, /hasStructuralElementMutation\(record\) \|\| hasLinkedScreenStateMutation\(record\)/);
});

test("all cinematic showcase consumers share one public showcase service module URL", () => {
  assert.match(page, /public-showcase-service\.js\?v=1/);
  assert.match(scenarioWriter, /public-showcase-service\.js\?v=1/);
  assert.match(supportingCast, /public-showcase-service\.js\?v=1/);
  assert.match(finalTrailer, /public-showcase-service\.js\?v=1/);
  assert.doesNotMatch(finalTrailer, /public-showcase-service\.js\?v=20260912a/);
});
