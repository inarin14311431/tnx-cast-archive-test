import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const entry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const baseCss = fs.readFileSync("css-next/pages/acts.css", "utf8");
const historyCss = fs.readFileSync("css-next/pages/acts-history-enhanced.css", "utf8");
const clarityCss = fs.readFileSync("css-next/pages/acts-clarity.css", "utf8");
const recordCss = fs.readFileSync("css-next/pages/acts-record.css", "utf8");
const spendingCss = fs.readFileSync("css-next/pages/acts-spending.css", "utf8");
const maintenanceCss = fs.readFileSync("css-next/pages/acts-maintenance.css", "utf8");

test("ACT CSS entry exposes the production page responsibilities", () => {
  assert.match(entry, /acts\.css\?v=4/);
  assert.match(entry, /acts-history-enhanced\.css\?v=1/);
  assert.match(entry, /acts-clarity\.css\?v=1/);
  assert.match(entry, /acts-record\.css\?v=1/);
  assert.match(entry, /acts-spending\.css\?v=1/);
  assert.match(entry, /acts-maintenance\.css\?v=4/);
  assert.doesNotMatch(entry, /acts-history\.css|acts-responsive\.css/);
});

test("production ACT CSS modules are present and non-empty", () => {
  for (const source of [baseCss, historyCss, clarityCss, recordCss, spendingCss, maintenanceCss]) {
    assert.ok(source.trim().length > 0);
  }
});

test("enhanced history stylesheet owns filters, year archive and compact summaries", () => {
  assert.match(historyCss, /\.act-history-filters/);
  assert.match(historyCss, /\.act-year-group/);
  assert.match(historyCss, /\.act-record-summary/);
  assert.match(historyCss, /\.act-record-summary__title/);
});

test("expanded records and spending ledger retain their dedicated modules", () => {
  assert.match(recordCss, /\.act-record\.is-detail-open/);
  assert.match(spendingCss, /\.experience-spending-record/);
});
