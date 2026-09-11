import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const supportedExtensions = new Set([".html", ".js", ".mjs", ".css"]);

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function stripQueryAndHash(raw) {
  return String(raw || "").split("#")[0].split("?")[0];
}

function isExternal(raw) {
  const value = String(raw || "").trim();
  return !value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value);
}

function htmlReferences(source) {
  return [
    ...[...source.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]),
    ...[...source.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi)].map(match => match[1])
  ];
}

function javascriptReferences(source) {
  const values = [];
  for (const match of source.matchAll(/\bimport\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']/g)) values.push(match[1]);
  for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) values.push(match[1]);
  for (const match of source.matchAll(/\bexport\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g)) values.push(match[1]);
  return values;
}

function cssReferences(source) {
  const values = [];
  for (const match of source.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?/gi)) values.push(match[1]);
  return values;
}

function referencesFor(file, source) {
  const extension = path.extname(file).toLowerCase();
  if (extension === ".html") return htmlReferences(source);
  if (extension === ".js" || extension === ".mjs") return javascriptReferences(source);
  if (extension === ".css") return cssReferences(source);
  return [];
}

function resolveLocal(importer, raw) {
  if (isExternal(raw)) return null;
  const clean = stripQueryAndHash(raw);
  if (!clean) return null;
  const resolved = clean.startsWith("/")
    ? path.resolve(root, clean.replace(/^\/+/, ""))
    : path.resolve(path.dirname(importer), clean);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

export function versionOf(raw) {
  const match = String(raw || "").match(/[?&]v=([^&#]+)/);
  return match ? match[1] : null;
}

export function withVersion(raw, version) {
  const value = String(raw || "");
  const hashIndex = value.indexOf("#");
  const main = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const hash = hashIndex >= 0 ? value.slice(hashIndex) : "";
  if (/[?&]v=/.test(main)) {
    return main.replace(/([?&]v=)[^&#]*/, `$1${version}`) + hash;
  }
  return `${main}${main.includes("?") ? "&" : "?"}v=${version}${hash}`;
}

export async function loadEditorCachePolicy() {
  const policyPath = path.join(root, "config/editor-cache-version.json");
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  const version = String(policy.version || "").trim();
  const entries = Array.isArray(policy.scope) ? policy.scope.map(String) : [];
  const testFiles = Array.isArray(policy.testFiles) ? policy.testFiles.map(String) : [];
  if (!/^\d{10}$/.test(version)) {
    throw new Error(`editor cache version must use YYYYMMDDNN (10 digits): ${version || "<empty>"}`);
  }
  if (!entries.length) throw new Error("editor cache version scope must include at least one entry file");
  return { version, entries, testFiles };
}

export async function collectEditorGraph(entries) {
  const queue = entries.map(entry => path.resolve(root, entry));
  const visited = new Set();
  const files = new Map();
  const edges = [];

  while (queue.length) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    if (!await exists(file)) throw new Error(`editor cache entry is missing: ${relative(file)}`);

    const source = await readFile(file, "utf8");
    const fileName = relative(file);
    files.set(fileName, source);

    for (const raw of referencesFor(file, source)) {
      const target = resolveLocal(file, raw);
      if (!target) continue;
      const targetName = relative(target);
      edges.push({ from: fileName, raw, to: targetName, version: versionOf(raw) });
      if (!supportedExtensions.has(path.extname(target).toLowerCase())) continue;
      if (await exists(target) && !visited.has(target)) queue.push(target);
    }
  }

  return { files, edges };
}

export function replacementsForVersionedTargets(edges, version) {
  const versionedTargets = new Set(edges.filter(edge => edge.version !== null).map(edge => edge.to));
  const replacements = new Map();

  for (const edge of edges) {
    if (!versionedTargets.has(edge.to)) continue;
    const next = withVersion(edge.raw, version);
    if (next === edge.raw) continue;
    if (!replacements.has(edge.from)) replacements.set(edge.from, new Map());
    replacements.get(edge.from).set(edge.raw, next);
  }

  return { versionedTargets, replacements };
}
