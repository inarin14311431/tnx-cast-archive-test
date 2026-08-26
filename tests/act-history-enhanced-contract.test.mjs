import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("acts.html", "utf8");
const entry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const js = fs.readFileSync("js/acts-history-enhanced.js", "utf8");
const css = fs.readFileSync("css-next/pages/acts-history-enhanced.css", "utf8");

test("act history exposes scalable browse filters", () => {
  assert.match(html, /id="history-year-filter"/);
  assert.match(html, /id="history-query-filter"/);
  assert.match(html, /id="history-role-filter"/);
  assert.match(html, /id="history-sort-filter"/);
  assert.match(html, /acts-history-enhanced\.js\?v=1/);
});

test("act history groups records by year and keeps latest year open", () => {
  assert.match(js, /act-year-group/);
  assert.match(js, /YEAR ARCHIVE/);
  assert.match(js, /defaultExpanded = year === latestYear/);
  assert.match(js, /expandedYears/);
});

test("act records use compact one-line summary with expandable details", () => {
  assert.match(js, /act-record-summary/);
  assert.match(js, /dataset\.toggleActDetail/);
  assert.match(js, /is-detail-open/);
  assert.match(css, /grid-template-columns:\s*108px minmax\(220px, 1fr\)/);
  assert.match(css, /text-overflow:\s*ellipsis/);
});

test("enhanced history stylesheet is part of the canonical acts entry", () => {
  assert.match(entry, /acts-history-enhanced\.css\?v=1/);
});
