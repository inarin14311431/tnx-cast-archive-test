import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const entry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const historyCss = fs.readFileSync("css-next/pages/acts-history.css", "utf8");
const recordCss = fs.readFileSync("css-next/pages/acts-record.css", "utf8");
const spendingCss = fs.readFileSync("css-next/pages/acts-spending.css", "utf8");
const responsiveCss = fs.readFileSync("css-next/pages/acts-responsive.css", "utf8");

test("ACT CSS entry exposes five explicit page responsibilities", () => {
  assert.match(entry, /acts\.css\?v=4/);
  assert.match(entry, /acts-history\.css\?v=1/);
  assert.match(entry, /acts-record\.css\?v=1/);
  assert.match(entry, /acts-spending\.css\?v=1/);
  assert.match(entry, /acts-responsive\.css\?v=1/);
  assert.doesNotMatch(entry, /acts-history-enhanced\.css|acts-clarity\.css|acts-maintenance\.css/);
});

test("history stylesheet owns filters, year archive, compact rows, and section tone", () => {
  assert.match(historyCss, /\.act-history-filters/);
  assert.match(historyCss, /\.act-year-group/);
  assert.match(historyCss, /\.act-record-summary/);
  assert.match(historyCss, /\.act-record-summary__cast/);
  assert.match(historyCss, /\.act-history-panel--acts[\s\S]*--section-tone/s);
  assert.match(historyCss, /\.act-history-panel--experience[\s\S]*--section-tone/s);
});

test("expanded records have exactly one canonical stylesheet owner", () => {
  assert.match(recordCss, /\.act-record\.is-detail-open/);
  assert.match(recordCss, /grid-template-areas:[\s\S]*"summary summary"[\s\S]*"main exp"[\s\S]*"facts exp"/s);
  assert.match(recordCss, /> \.act-record-summary\s*\{[\s\S]*grid-area:\s*summary[\s\S]*margin:\s*0[\s\S]*width:\s*100%/s);
  assert.doesNotMatch(recordCss, /margin(?:-inline)?:\s*-\d/);
  assert.doesNotMatch(historyCss, /\.act-record\.is-detail-open\s*\{/);
  assert.doesNotMatch(spendingCss, /\.act-record\.is-detail-open/);
  assert.doesNotMatch(responsiveCss, /\.act-record\.is-detail-open/);
});

test("responsive stylesheet contains compatibility rules only", () => {
  assert.match(responsiveCss, /safe-area-inset-top/);
  assert.match(responsiveCss, /input\[type="date"\][\s\S]*width:\s*100%[\s\S]*min-width:\s*0[\s\S]*max-width:\s*100%/s);
  assert.doesNotMatch(responsiveCss, /\.act-record\.is-detail-open/);
});

test("spending ledger keeps its own card treatment", () => {
  assert.match(spendingCss, /\.experience-spending-record\s*\{[\s\S]*border-radius:\s*13px/s);
  assert.match(spendingCss, /\.experience-spending-record__delete\s*\{[\s\S]*border-radius:\s*999px/s);
});
