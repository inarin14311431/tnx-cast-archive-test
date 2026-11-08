import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { generationFailed, hasGeneratedOutput, SETTLE_QUIET_MS } from "../js/showcase-generation-settle.js";

const read = path => fs.readFileSync(path, "utf8");
const loader = read("js/showcase-generator-loader.js");

test("the publish flow loads after the guests and before the guest bridge and the publisher (capture listeners run in order)", () => {
  const guests = loader.indexOf("showcase-guests.js");
  const flow = loader.indexOf("showcase-publish-flow.js");
  const bridge = loader.indexOf("showcase-guest-publish-bridge.js");
  const publisher = loader.indexOf("showcase-dynamic-publish-v3.js");
  assert.ok(guests >= 0 && flow > guests && bridge > flow && publisher > bridge);
});

test("the publish flow only holds clicks that have no generated output and replays them after the output settled", () => {
  const source = read("js/showcase-publish-flow.js");
  assert.match(source, /closest\?\.\("\[data-publish-mode\]"\)/);
  assert.match(source, /if \(hasGeneratedOutput\(preview\)\) return;/);
  assert.match(source, /generateAndSettle\(\{ preview, status, generateButton \}\)/);
  assert.match(source, /button\.click\(\)/);
  assert.match(source, /data-showcase-generating/);
});

test("the publisher no longer waits for a generated output and blocks only private casts, a running publication or generation", () => {
  const source = read("js/showcase-dynamic-publish-v3.js");
  assert.doesNotMatch(source, /legacyPublishButton/);
  assert.match(source, /const unavailable = publishing \|\| blockedByPrivate \|\| document\.documentElement\.hasAttribute\("data-showcase-generating"\)/);
  assert.match(source, /#selected-casts \[data-visibility="private"\]/);
  // Still the data source: the publisher parses the generated HTML and asks for it when there is none.
  assert.match(source, /先にHTMLを生成してください/);
});

test("changing the subtitle empties the output without disabling the publish buttons", () => {
  const source = read("js/showcase-act-subtitle.js");
  assert.doesNotMatch(source, /publishButtons/);
  assert.match(source, /preview\.srcdoc = ""/);
});

test("a blank page title falls back to the act title, and a restored act keeps its saved page title", () => {
  const generator = read("js/showcase-generator-v3.js");
  assert.match(generator, /title: elements\.pageTitle\?\.value\.trim\(\) \|\| elements\.actName\?\.value\.trim\(\) \|\| "ACT CAST FILE"/);
  const html = read("showcase-generator.html");
  assert.match(html, /<input id="page-title" type="text" value="" placeholder="空欄ならアクトタイトルを使います">/);
  const restore = read("js/showcase-edit-restore.js");
  assert.match(restore, /setField\(elements\.pageTitle, showcase\.pageTitle \|\| "ACT CAST FILE"\)/);
});

test("the settle helpers read the output and the error state of the generator", () => {
  assert.equal(hasGeneratedOutput({ srcdoc: "" }), false);
  assert.equal(hasGeneratedOutput({ srcdoc: "  \n" }), false);
  assert.equal(hasGeneratedOutput({ srcdoc: "<!doctype html>" }), true);
  assert.equal(hasGeneratedOutput(null), false);
  assert.equal(generationFailed({ classList: { contains: name => name === "is-error" } }), true);
  assert.equal(generationFailed({ classList: { contains: () => false } }), false);
  assert.equal(generationFailed(null), false);
  assert.ok(SETTLE_QUIET_MS >= 60);
});

test("the published band toggle is a static import of the loader; the generator shell loads beside the core modules", () => {
  assert.match(loader, /^\/\/[^\n]*\nimport "\.\/showcase-owned-band\.js\?v=[0-9a-f]+";/);
  assert.match(loader, /void import\("\.\/showcase-generator-shell\.js\?v=[0-9a-f]+"\)\.catch/);
  assert.doesNotMatch(read("js/showcase-generator-shell.js"), /owned-showcase-toggle/);
  assert.match(read("js/showcase-owned-band.js"), /owned-showcase-toggle/);
});
