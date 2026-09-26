import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/cast-style-skill-table-controls.js", import.meta.url), "utf8");
const castHtml = await readFile(new URL("../cast.html", import.meta.url), "utf8");
const entry = await readFile(new URL("../css-next/pages/cast-entry.css", import.meta.url), "utf8");
const tableCss = await readFile(new URL("../css-next/pages/cast-style-skill-table.css", import.meta.url), "utf8");

test("cast.html loads the table controls after the style skill renderer", () => {
  assert.match(castHtml, /<body data-page="cast\.html">/);
  const styleSkills = castHtml.indexOf("./js/cast-style-skills.js");
  const controls = castHtml.indexOf('<script src="./js/cast-style-skill-table-controls.js?v=2"></script>');
  assert.ok(styleSkills >= 0 && controls > styleSkills, "controls must load after cast-style-skills.js");
});

test("cast entry loads the style table stylesheet as the final cascade layer", () => {
  assert.match(entry, /cast-desktop, cast-style-table;/);
  const imports = [...entry.matchAll(/@import url\("([^"]+)"\) layer\(([^)]+)\);/g)];
  assert.deepEqual(imports.at(-1)?.slice(1), ["./cast-style-skill-table.css?v=1", "cast-style-table"]);
  assert.match(tableCss, /\.style-skill-view-table\.is-table-controlled thead th/);
});

test("the cast-v3 trial page and its stylesheet entry are retired", () => {
  assert.equal(existsSync(new URL("../cast-v3.html", import.meta.url)), false);
  assert.equal(existsSync(new URL("../css-next/pages/cast-v3-entry.css", import.meta.url)), false);
  assert.equal(existsSync(new URL("../css-next/pages/cast-v3-style-table.css", import.meta.url)), false);
  assert.doesNotMatch(castHtml, /cast-v3|data-cast-variant/);
  assert.doesNotMatch(entry, /cast-v3/);
});

test("table controls are presentation-only and follow the render event", () => {
  assert.match(source, /tnx:style-skills-rendered/);
  assert.doesNotMatch(source, /supabase|getStyleSkills|from\(["']/);
  assert.doesNotMatch(source, /new MutationObserver/);
  assert.match(source, /table\.dataset\.tableControls === "1"/);
  assert.doesNotMatch(source, /v3Controls|is-v3-controlled/);
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

test("column width storage key is kept from the trial so saved widths carry over", () => {
  assert.match(source, /const STORAGE_KEY = "tnx\.castV3\.styleSkillColumnWidths\.v1";/);
});
