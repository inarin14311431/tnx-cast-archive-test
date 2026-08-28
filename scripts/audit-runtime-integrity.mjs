import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function filesUnder(directory, extension) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(full, extension));
    else if (!extension || full.endsWith(extension)) result.push(full);
  }
  return result.sort();
}

const relative = file => path.relative(root, file).replaceAll(path.sep, "/");

function localAssetPath(raw) {
  const value = String(raw || "").trim();
  if (!value || /^(?:https?:|data:|mailto:|javascript:|#)/i.test(value) || value.includes("${")) return null;
  const clean = value.split("#")[0].split("?")[0];
  if (!clean) return null;
  return clean.startsWith("/") ? clean.slice(1) : clean.replace(/^\.\//, "");
}

const rootEntries = await readdir(root, { withFileTypes: true });
const htmlFiles = rootEntries
  .filter(entry => entry.isFile() && entry.name.endsWith(".html"))
  .map(entry => path.join(root, entry.name));

for (const file of htmlFiles) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi)) {
    const asset = localAssetPath(match[1]);
    if (!asset) continue;
    const target = path.resolve(root, asset);
    if (!target.startsWith(root + path.sep) && target !== root) {
      problems.push(`${relative(file)}: asset escapes repository root: ${match[1]}`);
      continue;
    }
    if (!await exists(target)) problems.push(`${relative(file)}: missing local asset ${asset}`);
  }
}

// Presentation must stay in static stylesheets. There are no remaining runtime-style exceptions.
const jsFiles = await filesUnder(path.join(root, "js"), ".js");
for (const file of jsFiles) {
  const source = await readFile(file, "utf8");
  const name = relative(file);
  if (/document\.createElement\s*\(\s*["']style["']\s*\)/.test(source)) {
    problems.push(`${name}: runtime <style> creation is prohibited; move presentation to a static stylesheet`);
  }
}

// MutationObserver ownership is inventory-controlled. The manifest records the current baseline;
// it is not a blanket approval of each observer's performance characteristics.
const observerManifest = JSON.parse(await readFile(path.join(root, "runtime-observer-manifest.json"), "utf8"));
const registeredMutationFiles = new Set(observerManifest.files || []);
if (registeredMutationFiles.size !== (observerManifest.files || []).length) {
  problems.push("runtime-observer-manifest.json: duplicate MutationObserver module entries");
}
const observedMutationFiles = new Set();
for (const file of jsFiles) {
  const source = await readFile(file, "utf8");
  const name = relative(file);
  if (!/\bnew\s+MutationObserver\s*\(/.test(source)) continue;
  observedMutationFiles.add(name);
  if (!registeredMutationFiles.has(name)) {
    problems.push(`${name}: MutationObserver is not registered in runtime-observer-manifest.json`);
  }
}
for (const name of registeredMutationFiles) {
  if (!observedMutationFiles.has(name)) {
    problems.push(`${name}: stale MutationObserver manifest entry`);
  }
}

// ACT Showcase runtime presentation is owned exclusively by css-next.
const showcasePageSource = await readFile(path.join(root, "act-showcase.html"), "utf8");
const showcaseStylesheets = [...showcasePageSource.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
  .map(match => localAssetPath(match[1]))
  .filter(Boolean);
if (!showcaseStylesheets.includes("css-next/pages/act-showcase.css")) {
  problems.push("act-showcase.html: ACT Showcase runtime stylesheet must be css-next/pages/act-showcase.css");
}
if (showcaseStylesheets.some(stylesheet => stylesheet.startsWith("assets/styles/"))) {
  problems.push("act-showcase.html: legacy assets/styles stylesheet must never be linked at runtime");
}
if (/<style\b/i.test(showcasePageSource)) problems.push("act-showcase.html: inline <style> is prohibited");

const showcaseCanonical = path.join(root, "css-next", "pages", "act-showcase.css");
if (!await exists(showcaseCanonical)) {
  problems.push("css-next/pages/act-showcase.css: canonical ACT Showcase stylesheet missing");
}
const standaloneStylesDir = path.join(root, "assets", "styles");
if (await exists(standaloneStylesDir)) {
  const standaloneCssFiles = await filesUnder(standaloneStylesDir, ".css");
  for (const file of standaloneCssFiles) {
    problems.push(`${relative(file)}: unowned legacy standalone stylesheet`);
  }
}

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
for (const [name, command] of Object.entries(packageJson.scripts || {})) {
  for (const match of String(command).matchAll(/node\s+--check\s+([^\s;&|]+)/g)) {
    const target = match[1].replace(/^['"]|['"]$/g, "");
    if (!await exists(path.resolve(root, target))) problems.push(`package.json script ${name}: missing node --check target ${target}`);
  }
}

for (const retired of ["transfer-form-prototype.html", "js/transfer-form-prototype.js"]) {
  if (await exists(path.join(root, retired))) problems.push(`${retired}: retired transfer prototype must not be restored`);
}

const importSource = await readFile(path.join(root, "js", "sheet-import-url.js"), "utf8");
if (!importSource.includes("character-sheets-url-import")) {
  problems.push("js/sheet-import-url.js: Character Sheets URL import UI contract missing");
}
if (/createElement\s*\(\s*["']style["']/.test(importSource)) {
  problems.push("js/sheet-import-url.js: URL import styling must remain in css-next");
}

const importCss = path.join(root, "css-next", "components", "sheet-url-import.css");
if (!await exists(importCss)) problems.push("css-next/components/sheet-url-import.css: static URL import styles missing");

const legacyManual = await readFile(path.join(root, "manual-data-import.html"), "utf8");
if (!legacyManual.includes("旧方式（非常用）")) {
  problems.push("manual-data-import.html: legacy import guide must be clearly marked as emergency/legacy");
}

if (problems.length) {
  console.error("Runtime integrity audit failed:\n" + problems.map(problem => `- ${problem}`).join("\n"));
  process.exit(1);
}

console.log(`Runtime integrity audit passed: ${htmlFiles.length} root HTML files, ${jsFiles.length} JavaScript files, ${observedMutationFiles.size} inventoried MutationObserver modules; ACT Showcase runtime CSS is owned exclusively by css-next.`);
