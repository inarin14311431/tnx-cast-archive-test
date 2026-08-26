import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("acts.html", "utf8");
const entry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const js = fs.readFileSync("js/acts-history-enhanced.js", "utf8");
const css = fs.readFileSync("css-next/pages/acts-history-enhanced.css", "utf8");
const clarityCss = fs.readFileSync("css-next/pages/acts-clarity.css", "utf8");

test("act history integrates browse filters into the primary section", () => {
  assert.match(html, /act-history-panel--acts/);
  assert.match(html, /<span>01<\/span><h2>参加アクト/);
  assert.match(html, /history-player-filter" hidden/);
  assert.match(html, /id="history-cast-filter"/);
  assert.match(html, /id="history-year-filter"/);
  assert.match(html, /id="history-query-filter"/);
  assert.match(html, /id="history-role-filter"/);
  assert.match(html, /id="history-sort-filter"/);
  assert.match(html, /id="history-filter-status"/);
  assert.match(html, /acts-history-enhanced\.js\?v=2/);
});

test("experience summary and spending history share the secondary section", () => {
  assert.match(html, /act-history-panel--experience/);
  assert.match(html, /<span>02<\/span><h2>経験点/);
  assert.match(html, /id="history-exp-total"/);
  assert.match(html, /id="history-spent-total"/);
  assert.match(html, /id="history-balance-total"/);
  assert.match(html, /id="experience-spending-form"/);
  assert.match(html, /id="experience-spending-list"/);
  assert.doesNotMatch(html, /<span>03<\/span>/);
});

test("act history groups the flat archive by year and keeps latest year open", () => {
  assert.match(js, /flattenHistory/);
  assert.match(js, /act-character-group--flat/);
  assert.match(js, /act-year-group/);
  assert.match(js, /YEAR ARCHIVE/);
  assert.match(js, /defaultExpanded = year === latestYear/);
  assert.match(js, /expandedYears/);
});

test("act records expose cast context and expandable compact details", () => {
  assert.match(js, /act-record-summary__cast/);
  assert.match(js, /dataset\.historyCast/);
  assert.match(js, /dataset\.toggleActDetail/);
  assert.match(js, /is-detail-open/);
  assert.match(css, /text-overflow:\s*ellipsis/);
});

test("clarity stylesheet separates section colors and mobile row hierarchy", () => {
  assert.match(entry, /acts-history-enhanced\.css\?v=1/);
  assert.match(entry, /acts-clarity\.css\?v=1/);
  assert.match(clarityCss, /act-history-panel--acts[\s\S]*--section-tone/);
  assert.match(clarityCss, /act-history-panel--experience[\s\S]*--section-tone/);
  assert.match(clarityCss, /@media \(max-width: 700px\)[\s\S]*grid-template-areas:[\s\S]*"title exp"[\s\S]*"cast icon"[\s\S]*"date role"/);
});
