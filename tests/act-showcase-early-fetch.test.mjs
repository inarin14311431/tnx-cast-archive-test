import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

// The two public data requests start from the bootstrap, before its 16 modules are loaded one after another (on Slow 4G they used to
// start 7.6 s in). They are cached by public-showcase-service.js, so the page and the supporting cast take the same promises: for that
// the bootstrap must import the service under the very URL the others use (another URL is another module, with a cache of its own).
const read = file => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("the bootstrap starts the showcase and guest requests before its first await", async () => {
  const source = await read("js/act-showcase-bootstrap.js");
  assertVersionedMatch(source, /import \{ loadPublicShowcase, loadPublicShowcaseGuests, normalizeShowcaseSlug \} from "\.\/public-showcase-service\.js\?v=VERSION";/);
  const start = source.indexOf("for (const load of [loadPublicShowcase, loadPublicShowcaseGuests])");
  const firstAwait = source.search(/\n\s*await import\(/);
  assert.ok(start > -1 && firstAwait > start, "the requests start before the first await");
  assert.match(source, /normalizeShowcaseSlug\(new URLSearchParams\(location\.search\)\.get\("id"\)\)/);
  // a failure is left to the page (the cache forgets it, the page asks again and reports it), never an unhandled rejection
  assert.match(source, /\.catch\(\(\) => \{\}\)/);
});

test("every module that uses the service imports it under the same URL as the bootstrap", async () => {
  const urls = new Set();
  for (const file of ["js/act-showcase-bootstrap.js", "js/act-showcase-page.js", "js/act-showcase-supporting-cast.js"]) {
    const found = (await read(file)).match(/from "\.\/public-showcase-service\.js(?:\?v=[0-9a-f]{8})?"/g) || [];
    assert.ok(found.length, `${file} imports the service`);
    for (const url of found) urls.add(url);
  }
  assert.equal(urls.size, 1, [...urls].join(" / "));
});

test("the modules of the B patterns are imported with a version, so a changed module is not served from the browser cache", async () => {
  for (const [file, name] of [["js/act-showcase-neotokyo.js", "act-showcase-(?:trailer-b|title-b|ready-b|caret)"], ["js/act-showcase-page.js", "act-showcase-ready-b"], ["js/act-showcase-ready-b.js", "(?:showcase-display-format|act-showcase-visual-caption)"]]) {
    const source = await read(file);
    for (const match of source.matchAll(new RegExp(`from "\\./(${name})\\.js([^"]*)"`, "g"))) assert.match(match[2], /^\?v=[0-9a-f]{8}$/, `${file}: ${match[1]}`);
  }
});
