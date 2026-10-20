import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/* Counting rules for audit:colors. A "hardcoded color" is a #hex, rgb()/rgba() or hsl()/hsla() written
 * directly in a stylesheet or script. Not counted: a fallback inside var(--x, <color>), the value of a
 * custom property definition (--x: <color>, setProperty("--x", <color>)), and anything in a comment. */

const CSS_EXCLUDED_DIRS = ["css-next/themes/", "css-next/foundation/", "css-next/tokens/"];
const JS_EXCLUDED_DIRS = ["js/vendor/"];
const JS_EXCLUDED_FILES = ["js/style-colors.js"];

const HEX = /(?<![\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![\w-])/gi;
const FUNCTIONAL = /(?<![\w-])(?:rgb|hsl)a?\(/gi;

export function isTargetFile(relativePath) {
  if (relativePath.split("/").some(segment => /showcase/i.test(segment))) return false;
  if (relativePath.startsWith("css-next/") && relativePath.endsWith(".css")) {
    return !CSS_EXCLUDED_DIRS.some(directory => relativePath.startsWith(directory));
  }
  if (relativePath.startsWith("js/") && relativePath.endsWith(".js")) {
    return !JS_EXCLUDED_DIRS.some(directory => relativePath.startsWith(directory))
      && !JS_EXCLUDED_FILES.includes(relativePath);
  }
  return false;
}

function stripComments(source, kind) {
  if (kind === "css") return source.replace(/\/\*[\s\S]*?\*\//g, " ");
  // One pass so that a "/*" inside a "//" comment (or the reverse) is read in source order. A "//" only starts
  // a comment after whitespace or code punctuation, which keeps "https://..." inside strings intact.
  return source.replace(/\/\*[\s\S]*?\*\/|(^|[\s;,{}()])\/\/[^\n]*/g, (match, lead) => lead ?? " ");
}

function stripVarFallbacks(source) {
  let result = "";
  let cursor = 0;
  const opener = /(?<![\w-])var\(/g;
  for (let match = opener.exec(source); match; match = opener.exec(source)) {
    const start = match.index + match[0].length;
    let depth = 1;
    let comma = -1;
    let end = -1;
    for (let index = start; index < source.length; index++) {
      const character = source[index];
      if (character === "(") depth++;
      else if (character === ")" && --depth === 0) { end = index; break; }
      else if (character === "," && depth === 1 && comma === -1) comma = index;
    }
    if (end === -1) break;
    result += source.slice(cursor, comma === -1 ? end : comma);
    cursor = end;
    opener.lastIndex = end;
  }
  return result + source.slice(cursor);
}

function stripCustomPropertyValues(source, kind) {
  const definition = kind === "css" ? /--[\w-]+\s*:[^;{}]*/g : /--[\w-]+\s*:[^;{}\n"'`]*/g;
  const stripped = source.replace(definition, " ");
  if (kind === "css") return stripped;
  return stripped.replace(/setProperty\(\s*(["'`])--[\w-]+\1\s*,[^)]*\)/g, " ");
}

export function countHardcodedColors(source, kind) {
  const code = stripVarFallbacks(stripCustomPropertyValues(stripComments(String(source), kind), kind));
  return (code.match(HEX)?.length ?? 0) + (code.match(FUNCTIONAL)?.length ?? 0);
}

async function filesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(full));
    else result.push(full);
  }
  return result;
}

export async function collectColorCounts(root) {
  const counts = {};
  for (const top of ["css-next", "js"]) {
    for (const file of await filesUnder(path.join(root, top))) {
      const relativePath = path.relative(root, file).replaceAll(path.sep, "/");
      if (!isTargetFile(relativePath)) continue;
      const count = countHardcodedColors(await readFile(file, "utf8"), relativePath.endsWith(".css") ? "css" : "js");
      if (count > 0) counts[relativePath] = count;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
