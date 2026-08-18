import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../sheet-mobile.html", import.meta.url), "utf8");
const app = await readFile(new URL("../js/sheet-mobile-app.js", import.meta.url), "utf8");
const runtime = await readFile(new URL("../js/sheet-mobile-runtime.js", import.meta.url), "utf8");
const profile = await readFile(new URL("../js/sheet-mobile.js", import.meta.url), "utf8");
const styleCompat = await readFile(new URL("../js/sheet-mobile-style-existing-values.js", import.meta.url), "utf8");
const exp = await readFile(new URL("../js/sheet-mobile-header-exp.js", import.meta.url), "utf8");
const uiCss = await readFile(new URL("../css-next/pages/sheet-mobile-ui.css", import.meta.url), "utf8");
const skillsCss = await readFile(new URL("../css-next/pages/sheet-mobile-skills.css", import.meta.url), "utf8");
const outfitCss = await readFile(new URL("../css-next/pages/sheet-mobile-outfit.css", import.meta.url), "utf8");

test("mobile editor footer always opens explicit mobile cast view", () => {
  assert.match(html, /id="mobile-view-link"[^>]+href="\.\/cast\.html\?mobile=1"/);
  assert.match(profile, /cast\.html\?id=\$\{id\}&mobile=1/);
});

test("mobile editor keeps one application entry point", () => {
  const appScripts = [...html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(appScripts.length, 1);
  assert.match(appScripts[0], /sheet-mobile-app\.js/);
  assert.match(app, /sheet-mobile-save-coordinator\.js/);
  assert.match(app, /sheet-mobile\.js/);
  assert.match(app, /sheet-mobile-skills\.js/);
  assert.match(app, /sheet-mobile-outfit\.js/);
});

test("shared mobile context owns authentication and character lookup", () => {
  assert.match(runtime, /requireAuth\(\)/);
  assert.match(runtime, /from\("characters"\)/);
  assert.match(runtime, /contextPromise/);
  for (const source of [profile, styleCompat, exp]) {
    assert.match(source, /getMobileEditorContext/);
    assert.doesNotMatch(source, /requireAuth/);
  }
});

test("common editor component styles stay in UI stylesheet", () => {
  for (const selector of ["mobile-section-add", "mobile-unsaved-label", "mobile-danger-action", "mobile-editor-policy-note"]) {
    assert.match(uiCss, new RegExp(`\\.${selector}`));
  }
  assert.doesNotMatch(skillsCss, /\.mobile-danger-action\{/);
  assert.doesNotMatch(skillsCss, /\.mobile-unsaved-label\{/);
  assert.doesNotMatch(outfitCss, /\.mobile-unsaved-label\{/);
});
