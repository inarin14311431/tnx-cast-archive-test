import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [html, sheet, overlayJs, css, entry] = await Promise.all([
  read("sheet.html"), read("js/sheet.js"), read("js/sheet-load-overlay.js"),
  read("css-next/components/sheet-load-overlay.css"), read("css-next/pages/sheet-entry.css")
]);

test("sheet.html declares the loading screen skeleton, hidden by default and announced as busy", () => {
  assert.match(html, /<div id="sheet-load-overlay" class="sheet-load-overlay" role="status" aria-busy="true" hidden>/);
  for (const line of ["ACCESSING N◎VA ARCHIVE...", "AUTHENTICATING...", "RETRIEVING CAST DATA..."]) assert.ok(html.includes(line), line);
  assert.match(html, /アーカイブ接続中 <small>ARCHIVE LINK<\/small>/);
});

test("the loading screen only appears for existing casts and always has a 15s fail-safe in the HTML itself", () => {
  const script = html.match(/<script>\(function\(\)\{var o=document\.getElementById\("sheet-load-overlay"\).*?<\/script>/s)?.[0];
  assert.ok(script, "inline guard script");
  assert.match(script, /get\("id"\)\)return/);
  assert.match(script, /,15000\)/);
  assert.doesNotMatch(script, /focus\(/);
});

test("overlay module only toggles UI: no DB access and no focus handling", () => {
  assert.match(overlayJs, /export function dismissSheetLoadOverlay/);
  assert.doesNotMatch(overlayJs, /supabase|\.focus\(|from\(/);
});

test("sheet.js dismisses after the apply stage, on new casts, and when init fails before loading", () => {
  assert.match(sheet, /\} finally \{ loading = false; dismissSheetLoadOverlay\(\); \}/);
  assert.match(sheet, /saveCoordinator\.markDirty\(\);\n  dismissSheetLoadOverlay\(\);/);
  assert.match(sheet, /catch \(error\) \{[^}]*publishSheetCharacterLoadFailed\(\);\s*dismissSheetLoadOverlay\(\);\s*throw error;/s);
  assert.match(sheet, /if \(!user\) \{ publishSheetCharacterLoadFailed\(\); return; \}/);
});

test("overlay styling is theme-token driven and respects reduced motion without extra assets", () => {
  assert.match(css, /var\(--color-bg, /);
  assert.match(css, /var\(--color-accent, /);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /url\(|@font-face|!important|data-theme/);
  assertVersionedMatch(entry, /components\/sheet-load-overlay\.css\?v=VERSION/);
});
