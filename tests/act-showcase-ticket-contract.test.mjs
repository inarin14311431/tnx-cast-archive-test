import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const actsHtml = fs.readFileSync("acts.html", "utf8");
const actsEntry = fs.readFileSync("css-next/pages/acts-entry.css", "utf8");
const ticketJs = fs.readFileSync("js/experience-ticket.js", "utf8");
const showcaseHtml = fs.readFileSync("act-showcase.html", "utf8");
const showcaseCss = fs.readFileSync("assets/styles/act-showcase-refine.css", "utf8");

test("act history loads the experience ticket module and styles", () => {
  assert.match(actsHtml, /experience-ticket\.js\?v=1/);
  assert.match(actsEntry, /experience-ticket\.css\?v=1/);
  assert.match(ticketJs, /dataIssueTicket|dataset\.issueTicket/);
  assert.match(ticketJs, /window\.print\(\)/);
  assert.match(ticketJs, /参加履歴から表示用に生成/);
});

test("public act showcase loads its refinement layer", () => {
  assert.match(showcaseHtml, /act-showcase-refine\.css\?v=1/);
  assert.match(showcaseCss, /\.hero__act::before/);
  assert.match(showcaseCss, /DIRECTED BY/);
  assert.match(showcaseCss, /\.cast-card__tagline/);
  assert.match(showcaseCss, /@media \(max-width: 800px\)/);
});
