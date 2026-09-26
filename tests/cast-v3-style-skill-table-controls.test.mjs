import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-style-skill-table-controls.js", import.meta.url), "utf8");
const v3Html = await readFile(new URL("../cast-v3.html", import.meta.url), "utf8");
const castHtml = await readFile(new URL("../cast.html", import.meta.url), "utf8");
const v3Entry = await readFile(new URL("../css-next/pages/cast-v3-entry.css", import.meta.url), "utf8");

test("cast-v3 keeps the public cast runtime identity and loads the table controls", () => {
  assert.match(v3Html, /<body data-page="cast\.html" data-cast-variant="v3">/);
  assert.match(v3Html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(v3Html, /href="\.\/css-next\/pages\/cast-v3-entry\.css\?v=\d+"/);
  const styleSkills = v3Html.indexOf("./js/cast-style-skills.js");
  const controls = v3Html.indexOf("./js/cast-style-skill-table-controls.js?v=");
  assert.ok(styleSkills >= 0 && controls > styleSkills, "controls must load after cast-style-skills.js");
});

test("cast.html stays unchanged by the v3 experiment", () => {
  assert.doesNotMatch(castHtml, /cast-style-skill-table-controls/);
  assert.doesNotMatch(castHtml, /cast-v3-entry/);
});

test("cast-v3 stylesheet entry reuses the canonical cast entry", () => {
  assert.match(v3Entry, /@import url\("\.\/cast-entry\.css\?v=\d+"\);/);
  assert.match(v3Entry, /cast-v3-style-table\.css\?v=\d+"\) layer\(cast-v3\)/);
});

test("table controls are presentation-only and follow the render event", () => {
  assert.match(source, /tnx:style-skills-rendered/);
  assert.doesNotMatch(source, /supabase|getStyleSkills|from\(["']/);
  assert.doesNotMatch(source, /new MutationObserver/);
  assert.match(source, /table\.dataset\.v3Controls === "1"/);
});

test("sorting hides separators while sorted and restores original order (plan B)", () => {
  assert.match(source, /\.style-skill-public-separator/);
  assert.match(source, /row\.hidden = true/);
  assert.match(source, /row\.hidden = false/);
  assert.match(source, /dataset\.originalIndex/);
  assert.match(source, /direction === 1 \? -1 : sortState\.direction === -1 \? 0 : 1/);
});

test("header clicks ignore the description toggle and resize handles", () => {
  assert.match(source, /closest\("\.style-description-toggle-all, \.style-col-resizer"\)/);
});

test("column widths persist per viewer with guarded storage access", () => {
  assert.match(source, /try \{[\s\S]*?localStorage\.getItem\(STORAGE_KEY\)[\s\S]*?\} catch/);
  assert.match(source, /try \{[\s\S]*?localStorage\.setItem\(STORAGE_KEY/);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /MIN_WIDTH = \d+/);
});
