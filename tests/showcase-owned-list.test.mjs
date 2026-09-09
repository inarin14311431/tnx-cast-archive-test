import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const client = await readFile(new URL("../js/showcase-owned-list.js", import.meta.url), "utf8");
const loader = await readFile(new URL("../js/showcase-generator-loader.js", import.meta.url), "utf8");
const cssEntry = await readFile(new URL("../css-next/pages/showcase-entry.css", import.meta.url), "utf8");
const css = await readFile(new URL("../css-next/pages/showcase-owned-list.css", import.meta.url), "utf8");

test("published showcase management is visible as an explicit list", () => {
  assert.match(loader, /showcase-owned-list\.js\?v=1/);
  assert.match(client, /公開済みアクト紹介/);
  assert.match(client, /PUBLISHED SHOWCASE MANAGEMENT/);
  assert.match(client, /id = "owned-showcase-list"/);
  assert.match(client, /data-showcase-action="edit"/);
  assert.match(client, /data-showcase-action="delete"/);
  assert.match(client, /loadButton\.click\(\)/);
  assert.match(client, /deleteButton\.click\(\)/);
});

test("legacy dropdown stays available to the management logic but is hidden from the primary UI", () => {
  assert.match(client, /legacyControls\.hidden = true/);
  assert.match(client, /select\.value = slug/);
  assert.match(client, /MutationObserver\(renderOwnedShowcaseList\)/);
});

test("published showcase list styles are isolated and responsive", () => {
  assert.match(cssEntry, /showcase-owned-list\.css\?v=1/);
  assert.match(css, /\.owned-showcase-row/);
  assert.match(css, /button\.is-danger/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
