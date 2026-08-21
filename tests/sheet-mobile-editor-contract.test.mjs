import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../sheet-mobile.html", import.meta.url), "utf8");
const app = await readFile(new URL("../js/sheet-mobile-app.js", import.meta.url), "utf8");
const profile = await readFile(new URL("../js/sheet-mobile.js", import.meta.url), "utf8");
const ui = await readFile(new URL("../js/sheet-mobile-ui.js", import.meta.url), "utf8");

test("mobile editor keeps required sections and footer controls", () => {
  for (const id of [
    "mobile-profile",
    "mobile-styles-section",
    "mobile-ability-section",
    "mobile-general",
    "mobile-style-skills-section",
    "mobile-outfits-section",
    "mobile-view-link",
    "mobile-save"
  ]) assert.match(html, new RegExp(`id=["']${id}["']`));
});

test("mobile editor footer view link defaults to mobile rendering", () => {
  assert.match(html, /id=["']mobile-view-link["'][^>]*href=["'][^"']*[?&]mobile=1(?:&|["'])/i);
  assert.match(profile, /cast\.html\?id=\$\{id\}&mobile=1/);
});

test("mobile runtime loads before feature modules", () => {
  const runtime = app.indexOf("sheet-mobile-runtime.js");
  assert.ok(runtime >= 0, "runtime import must exist");
  for (const feature of ["sheet-mobile-profile.js", "sheet-mobile-style.js", "sheet-mobile-ability.js", "sheet-mobile-skills.js", "sheet-mobile-outfit.js"]) {
    const index = app.indexOf(feature);
    assert.ok(index >= 0, `${feature} import must exist`);
    assert.ok(runtime < index, `runtime must load before ${feature}`);
  }
});

test("mobile editor app owns feature bootstrapping through one module entry", () => {
  assert.match(html, /<script\b[^>]*type=["']module["'][^>]*src=["']\.\/js\/sheet-mobile-app\.js\?v=\d+["']/i);
  assert.doesNotMatch(html, /<script\b[^>]*src=["']\.\/js\/sheet-mobile-(?:profile|style|ability|skills|outfit|combos|snapshots|image)\.js/i);
});

test("mobile modal delete actions are promoted to the top without replacing feature delete handlers", () => {
  assert.match(ui, /function promoteDeleteAction\(source\)/);
  assert.match(ui, /body\.prepend\(proxy\)/);
  assert.match(ui, /proxy\._mobileDeleteSource\?\.click\(\)/);
  assert.match(ui, /source\.style\.display="none"/);
  assert.match(ui, /attributeFilter:\["hidden"\]/);
});
