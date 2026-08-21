import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const castHtml = await readFile(new URL("../cast.html", import.meta.url), "utf8");
const accountHtml = await readFile(new URL("../account.html", import.meta.url), "utf8");
const mobileReadability = await readFile(new URL("../css-next/pages/cast-mobile-readability.css", import.meta.url), "utf8");
const accountHierarchy = await readFile(new URL("../css-next/pages/account-action-hierarchy.css", import.meta.url), "utf8");

test("mobile cast readability layer is loaded after the base mobile stylesheet", () => {
  const base = castHtml.indexOf("cast-mobile.css?v=3");
  const readability = castHtml.indexOf("cast-mobile-readability.css?v=1");
  assert.ok(base >= 0);
  assert.ok(readability > base);
});

test("mobile cast gameplay text is promoted above legacy micro-text sizes", () => {
  assert.match(mobileReadability, /\.mobile-skill-row > strong \{ font-size: 11px;/);
  assert.match(mobileReadability, /\.mobile-outfit-card > strong \{ font-size: 11px;/);
  assert.match(mobileReadability, /\.mobile-combo-card > p \{ font-size: 10px;/);
  assert.match(mobileReadability, /@media \(max-width: 520px\)/);
  assert.match(mobileReadability, /\.mobile-core-skills \{ grid-template-columns: 1fr;/);
});

test("account cast actions have an explicit visual hierarchy", () => {
  assert.match(accountHtml, /account-action-hierarchy\.css\?v=1/);
  assert.match(accountHierarchy, /\.owned-cast__links > a:nth-child\(1\)/);
  assert.match(accountHierarchy, /grid-template-columns: minmax\(0, 1\.25fr\) minmax\(0, 1fr\) minmax\(0, \.86fr\)/);
  assert.match(accountHierarchy, /grid-column: 1 \/ -1/);
});
