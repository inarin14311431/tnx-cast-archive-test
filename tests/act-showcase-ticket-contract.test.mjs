import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const actsHtml = fs.readFileSync("acts.html", "utf8");
const actsEntry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const ticketJs = fs.readFileSync("js/experience-ticket.js", "utf8");
const ticketLayoutCss = fs.readFileSync("css-next/pages/experience-ticket-layout.css", "utf8");
const showcaseHtml = fs.readFileSync("act-showcase.html", "utf8");

test("act history loads the current experience ticket module and styles", () => {
  assert.match(actsHtml, /experience-ticket\.js\?v=5/);
  assert.match(actsHtml, /handle-format\.js\?v=3/);
  assert.match(actsEntry, /experience-ticket\.css\?v=3/);
  assert.match(actsEntry, /experience-ticket-layout\.css\?v=3/);
  assert.match(ticketJs, /dataIssueTicket|dataset\.issueTicket/);
  assert.match(ticketJs, /data-print-ticket/);
  assert.match(ticketJs, /印刷 \/ PDF/);
  assert.match(ticketJs, /window\.print\(\)/);
  assert.match(ticketJs, /参加履歴から表示用に生成/);
});

test("experience ticket keeps normalized dates and responsive single-line cast values", () => {
  assert.match(ticketJs, /meta\.match\(\/\\d\{4\}\[\\\/\.\\-\]\\d\{1,2\}\[\\\/\.\\-\]\\d\{1,2\}\//);
  assert.match(ticketJs, /formatTicketDate/);
  assert.match(ticketJs, /padStart\(2, "0"\)/);
  assert.match(ticketLayoutCss, /grid-template-columns:\s*minmax\(180px, \.42fr\) minmax\(0, 1\.58fr\)/);
  assert.match(ticketLayoutCss, /\.experience-ticket__field--cast > strong\s*\{[\s\S]*overflow:\s*hidden[\s\S]*text-overflow:\s*ellipsis[\s\S]*white-space:\s*nowrap/);
  assert.match(ticketLayoutCss, /@media \(max-width: 640px\)[\s\S]*grid-template-columns:\s*minmax\(112px, \.42fr\) minmax\(0, 1\.58fr\)/);
  assert.match(ticketLayoutCss, /\.experience-ticket__field--wide,[\s\S]*\.experience-ticket__field--signature\s*\{\s*grid-column:\s*1 \/ -1/);
});

test("experience ticket delegates printable output to the browser", () => {
  assert.match(ticketJs, /data-print-ticket/);
  assert.match(ticketJs, /window\.print\(\)/);
  assert.doesNotMatch(ticketJs, /canvas\.width|toDataURL\("image\/png"\)|data-save-ticket-png/);
});

test("public act showcase keeps the production runtime shell", () => {
  assert.match(showcaseHtml, /assets\/styles\/act-showcase\.css\?v=5/);
  assert.match(showcaseHtml, /js\/act-showcase\.js\?v=7/);
  assert.doesNotMatch(showcaseHtml, /act-showcase-refine\.css/);
  assert.doesNotMatch(showcaseHtml, /act-showcase-title-fit\.css/);
  assert.doesNotMatch(showcaseHtml, /handle-format\.js/);
  assert.doesNotMatch(showcaseHtml, /act-showcase-title-fit\.js/);
});
