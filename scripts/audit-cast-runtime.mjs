import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const htmlPath = path.join(root, "cast.html");
const html = fs.readFileSync(htmlPath, "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)]
  .map(match => match[1]);
const localScripts = scripts.filter(src => !/^(?:https?:)?\/\//i.test(src));
const clean = src => src.split(/[?#]/, 1)[0].replace(/^\.\//, "");
const cleanScripts = localScripts.map(clean);
const errors = [];

const duplicates = cleanScripts.filter((src, index) => cleanScripts.indexOf(src) !== index);
if (duplicates.length) errors.push(`duplicate script references: ${[...new Set(duplicates)].join(", ")}`);

for (const src of cleanScripts) {
  const resolved = path.resolve(root, src);
  if (!resolved.startsWith(root + path.sep)) {
    errors.push(`script escapes repository root: ${src}`);
    continue;
  }
  if (!fs.existsSync(resolved)) errors.push(`missing local script: ${src}`);
}

const core = "js/cast.js";
if (cleanScripts.filter(src => src === core).length !== 1) {
  errors.push(`${core} must be loaded exactly once`);
}

const coreIndex = cleanScripts.indexOf(core);
for (const dependent of [
  "js/cast-compact-skills.js",
  "js/cast-ui.js",
  "js/cast-style-skills.js",
  "js/cast-outfits.js",
  "js/cast-mobile.js",
  "js/cast-mobile-combos.js"
]) {
  const index = cleanScripts.indexOf(dependent);
  if (index >= 0 && coreIndex >= 0 && index < coreIndex) {
    errors.push(`${dependent} must remain after ${core}`);
  }
}

if (errors.length) {
  console.error("cast runtime audit failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`cast runtime audit passed: ${cleanScripts.length} local scripts`);
cleanScripts.forEach((src, index) => console.log(`${String(index + 1).padStart(2, "0")}. ${src}`));
