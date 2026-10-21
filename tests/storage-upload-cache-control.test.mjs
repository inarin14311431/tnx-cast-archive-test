import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const ONE_YEAR = "31536000";
const read = file => readFile(new URL(`../${file}`, import.meta.url), "utf8");

// A long cacheControl is only safe while every upload goes to a path nobody writes to again (the CDN may serve the old bytes
// for a year). These files always upload to a new path and never overwrite.
const UPLOADERS = [
  { file: "js/sheet-image.js", uploads: 2, uniquePath: /\$\{timestamp\}\.\$\{extension\}`/, uniqueThumbnail: /\$\{timestamp\}-thumb\.\$\{thumbnailExtension\}`/ },
  { file: "js/sheet-mobile-image.js", uploads: 2, uniquePath: /\$\{timestamp\}\.webp`/, uniqueThumbnail: /\$\{timestamp\}-thumb\.webp`/ },
  { file: "js/showcase-guests.js", uploads: 1, uniquePath: /crypto\.randomUUID\(\)/ }
];

for (const { file, uploads, uniquePath, uniqueThumbnail } of UPLOADERS) {
  test(`${file}: uploads cache for a year, never upsert, and always use a fresh path`, async () => {
    const source = await read(file);
    const calls = source.match(/\.upload\([^\n]*\)/g) || [];
    assert.equal(calls.length, uploads);
    for (const call of calls) {
      assert.match(call, new RegExp(`cacheControl:\\s*"${ONE_YEAR}"`));
      assert.match(call, /upsert:\s*false/);
    }
    assert.doesNotMatch(source, /upsert:\s*true/);
    assert.match(source, uniquePath);
    if (uniqueThumbnail) assert.match(source, uniqueThumbnail);
  });
}

test("no browser code overwrites a stored image (no upsert:true, no storage update())", async () => {
  for (const name of await readdir(new URL("../js/", import.meta.url))) {
    if (!name.endsWith(".js")) continue;
    const source = await read(`js/${name}`);
    assert.doesNotMatch(source, /upsert:\s*true/, name);
    assert.doesNotMatch(source, /\.storage\s*\.from\([^)]*\)\s*\.update\(/, name);
  }
});

test("the old short cache lifetimes are gone from the three uploaders", async () => {
  for (const { file } of UPLOADERS) {
    const source = await read(file);
    assert.doesNotMatch(source, /cacheControl:\s*"(?:86400|3600)"/, file);
  }
});
