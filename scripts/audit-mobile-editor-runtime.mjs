import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "sheet-mobile.html");
const appPath = path.join(root, "js/sheet-mobile-app.js");
const problems = [];

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

function localPath(raw) {
  const value = String(raw || "").trim();
  if (!value || /^(?:https?:|data:)/i.test(value)) return null;
  return value.split("#")[0].split("?")[0].replace(/^\.\//, "");
}

const html = await readFile(htmlPath, "utf8");
const app = await readFile(appPath, "utf8");

const assets = [
  ...[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]),
  ...[...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi)].map(match => match[1])
].map(localPath).filter(Boolean);

for (const asset of assets) {
  const target = path.resolve(root, asset);
  if (!target.startsWith(root + path.sep) && target !== root) problems.push(`sheet-mobile.html asset escapes repository root: ${asset}`);
  else if (!await exists(target)) problems.push(`sheet-mobile.html missing local asset: ${asset}`);
}

const appImports = [...app.matchAll(/import\s+["']([^"']+)["'];?/g)].map(match => match[1]);
const seen = new Set();
for (const raw of appImports) {
  const local = localPath(raw);
  if (!local) continue;
  const normalized = local.startsWith("js/") ? local : `js/${local.replace(/^\.\//, "")}`;
  if (seen.has(normalized)) problems.push(`sheet-mobile-app.js duplicate import: ${normalized}`);
  seen.add(normalized);
  const target = path.resolve(root, normalized);
  if (!await exists(target)) problems.push(`sheet-mobile-app.js missing import target: ${normalized}`);
}

for (const required of [
  "js/sheet-mobile-runtime.js",
  "js/sheet-mobile-save-coordinator.js",
  "js/sheet-mobile.js",
  "js/sheet-mobile-skills.js",
  "js/sheet-mobile-outfit.js",
  "js/sheet-mobile-combos.js",
  "js/sheet-mobile-snapshots.js",
  "js/sheet-mobile-image.js"
]) {
  if (!seen.has(required)) problems.push(`sheet-mobile-app.js required module is not imported: ${required}`);
}

const runtimeIndex = appImports.findIndex(value => localPath(value)?.endsWith("sheet-mobile-runtime.js"));
const featureIndex = appImports.findIndex(value => /sheet-mobile-(?:profile|style|ability|skills|outfit|combos|snapshots|image)\.js/.test(localPath(value) || ""));
if (runtimeIndex < 0) problems.push("sheet-mobile-app.js must import sheet-mobile-runtime.js explicitly");
else if (featureIndex >= 0 && runtimeIndex > featureIndex) problems.push("sheet-mobile-runtime.js must load before feature modules");

for (const id of [
  "mobile-profile",
  "mobile-styles-section",
  "mobile-ability-section",
  "mobile-general",
  "mobile-style-skills-section",
  "mobile-outfits-section",
  "mobile-view-link",
  "mobile-save"
]) {
  if (!html.includes(`id="${id}"`)) problems.push(`sheet-mobile.html missing required DOM id: ${id}`);
}

const viewLink = html.match(/<a\b[^>]*id=["']mobile-view-link["'][^>]*href=["']([^"']+)["']/i)?.[1] || "";
if (!/[?&]mobile=1(?:&|$)/.test(viewLink)) problems.push("mobile-view-link default href must force mobile=1");

if (problems.length) {
  console.error("Mobile editor runtime audit failed:\n" + problems.map(problem => `- ${problem}`).join("\n"));
  process.exit(1);
}

console.log(`Mobile editor runtime audit passed: ${assets.length} HTML assets and ${appImports.length} app imports verified.`);
