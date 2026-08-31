import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("cast and sheet composition roots are bootstrapped from the early shared head runtime", async () => {
  const themeScope = await read("js/theme-scope.js");
  assert.match(themeScope, /"cast\.html": "\.\/cast-app\.js\?v=1"/);
  assert.match(themeScope, /"sheet\.html": "\.\/sheet-app\.js\?v=1"/);
  assert.match(themeScope, /import\(pageRoot\)/);
});

test("composition roots declare explicit DOM owners and lifecycle events", async () => {
  const [castApp, sheetApp] = await Promise.all([read("js/cast-app.js"), read("js/sheet-app.js")]);
  assert.match(castApp, /#cast-content/);
  assert.match(castApp, /CAST_COMPOSITION_READY/);
  assert.match(sheetApp, /#style-skills/);
  assert.match(sheetApp, /#outfit-list/);
  assert.match(sheetApp, /SHEET_COMPOSITION_READY/);
});

test("shared application event names have one canonical module contract", async () => {
  const [events, multiline] = await Promise.all([read("js/app-events.js"), read("js/sheet-multiline-fields.js")]);
  assert.match(events, /OUTFIT_TABLES_RENDERED: "tnx:outfit-tables-rendered"/);
  assert.match(multiline, /APP_EVENTS\.OUTFIT_TABLES_RENDERED/);
  assert.doesNotMatch(multiline, /const OUTFIT_RENDER_EVENT=/);
});

test("historical versioned filenames are compatibility shims over responsibility names", async () => {
  const [legacyUi, legacyMultiline, canonicalUi, canonicalMultiline] = await Promise.all([
    read("js/ui-v25.js"),
    read("js/sheet-multiline-fields-v3.js"),
    read("js/sheet-skill-ui.js"),
    read("js/sheet-multiline-fields.js")
  ]);
  assert.match(legacyUi, /sheet-skill-ui\.js/);
  assert.match(legacyMultiline, /sheet-multiline-fields\.js/);
  assert.match(canonicalUi, /initializeSheetUi/);
  assert.match(canonicalMultiline, /TNXMultilineFields/);
});

test("module cycles are hard audit failures rather than warnings", async () => {
  const audit = await read("scripts/audit-module-graph.mjs");
  assert.match(audit, /problems\.push\(`module cycle:/);
  assert.doesNotMatch(audit, /warnings\.push\(`module cycle:/);
  assert.match(audit, /0 cycles/);
});

test("JavaScript architecture and compatibility retirement policy are documented", async () => {
  const [architecture, compatibility] = await Promise.all([
    read("docs/JAVASCRIPT_ARCHITECTURE.md"),
    read("docs/LEGACY_COMPATIBILITY.md")
  ]);
  assert.match(architecture, /Page composition root/);
  assert.match(architecture, /Module cycles are CI failures/);
  assert.match(compatibility, /Retirement condition/);
  assert.match(compatibility, /Historical runtime filenames/);
});
