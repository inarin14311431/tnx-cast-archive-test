import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const actsHtml = fs.readFileSync("acts.html", "utf8");
const actsEntry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const ticketJs = fs.readFileSync("js/experience-ticket.js", "utf8");
const ticketLayoutCss = fs.readFileSync("css-next/pages/experience-ticket-layout.css", "utf8");
const showcaseHtml = fs.readFileSync("act-showcase.html", "utf8");
const showcaseCss = fs.readFileSync("assets/styles/act-showcase-refine.css", "utf8");

test("act history loads the experience ticket module and styles", () => {
  assert.match(actsHtml, /experience-ticket\.js\?v=2/);
  assert.match(actsEntry, /experience-ticket\.css\?v=2/);
  assert.match(actsEntry, /experience-ticket-layout\.css\?v=1/);
  assert.match(ticketJs, /dataIssueTicket|dataset\.issueTicket/);
  assert.match(ticketJs, /window\.print\(\)/);
  assert.match(ticketJs, /参加履歴から表示用に生成/);
});

test("experience ticket keeps full date and cast name presentation", () => {
  assert.match(ticketJs, /meta\.match\(\/\\d\{4\}\[\\\/\.\\-\]\\d\{1,2\}\[\\\/\.\\-\]\\d\{1,2\}\//);
  assert.match(ticketJs, /formatTicketDate/);
  assert.match(ticketJs, /padStart\(2, "0"\)/);
  assert.match(ticketLayoutCss, /grid-template-columns:\s*minmax\(180px, \.42fr\) minmax\(0, 1\.58fr\)/);
  assert.match(ticketLayoutCss, /\.experience-ticket__field--cast > strong[\s\S]*white-space:\s*nowrap/);
});

test("public act showcase loads its refinement layer", () => {
  assert.match(showcaseHtml, /act-showcase-refine\.css\?v=1/);
  assert.match(showcaseCss, /\.hero__act::before/);
  assert.match(showcaseCss, /DIRECTED BY/);
  assert.match(showcaseCss, /\.cast-card__tagline/);
  assert.match(showcaseCss, /@media \(max-width: 800px\)/);
});
