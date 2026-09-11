import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const STATIC_IMPORT_RE = /(?:import|export)\s+(?:[^;"']*?\s+from\s+)?["'](\.[^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /import\s*\(\s*["'](\.[^"']+)["']\s*\)/g;

function normalizedRepoPath(path) {
  return relative(repoRoot, path).split(sep).join("/");
}

function parseSpecifier(specifier, sourcePath) {
  const [pathPart, query = ""] = specifier.split("?", 2);
  if (!pathPart.endsWith(".js")) return null;
  const targetPath = resolve(dirname(sourcePath), pathPart);
  if (!normalizedRepoPath(targetPath) || normalizedRepoPath(targetPath).startsWith("..")) return null;
  const params = new URLSearchParams(query);
  return {
    targetPath,
    target: normalizedRepoPath(targetPath),
    version: params.get("v") ?? ""
  };
}

function localSpecifiers(source) {
  const values = [];
  for (const expression of [STATIC_IMPORT_RE, DYNAMIC_IMPORT_RE]) {
    expression.lastIndex = 0;
    let match;
    while ((match = expression.exec(source))) values.push(match[1]);
  }
  return [...new Set(values)];
}

async function crawl(entries) {
  const queued = entries.map(entry => resolve(repoRoot, entry));
  const visited = new Set();
  const versions = new Map();

  while (queued.length) {
    const sourcePath = queued.shift();
    const sourceKey = normalizedRepoPath(sourcePath);
    if (visited.has(sourceKey)) continue;
    visited.add(sourceKey);

    const source = await readFile(sourcePath, "utf8");
    for (const specifier of localSpecifiers(source)) {
      const parsed = parseSpecifier(specifier, sourcePath);
      if (!parsed) continue;
      const list = versions.get(parsed.target) || [];
      list.push({ version: parsed.version, source: sourceKey, specifier });
      versions.set(parsed.target, list);
      if (!visited.has(parsed.target)) queued.push(parsed.targetPath);
    }
  }

  return versions;
}

function versionSet(edges) {
  return [...new Set(edges.map(edge => edge.version))].sort();
}

function describe(edges) {
  return edges.map(edge => `${edge.source} -> ${edge.specifier}`).join("\n");
}

const pcGraph = await crawl(["js/sheet.js", "js/privileged-tools-bootstrap.js"]);
const mobileGraph = await crawl(["js/sheet-mobile-app.js"]);

test("PC and mobile use the same cache-buster version for shared modules", () => {
  const shared = [...pcGraph.keys()].filter(target => mobileGraph.has(target)).sort();
  assert.ok(shared.includes("js/general-skill-catalog.js"), "general-skill-catalog.js must remain a shared module");
  assert.ok(shared.includes("js/sheet-row-collection-state.js"), "sheet-row-collection-state.js must remain a shared module");

  const mismatches = [];
  for (const target of shared) {
    const pc = versionSet(pcGraph.get(target));
    const mobile = versionSet(mobileGraph.get(target));
    if (pc.length !== 1 || mobile.length !== 1 || pc[0] !== mobile[0]) {
      mismatches.push([
        target,
        `PC versions: ${pc.map(value => value || "<none>").join(", ")}`,
        describe(pcGraph.get(target)),
        `Mobile versions: ${mobile.map(value => value || "<none>").join(", ")}`,
        describe(mobileGraph.get(target))
      ].join("\n"));
    }
  }

  assert.deepEqual(mismatches, [], `Shared module version mismatch:\n\n${mismatches.join("\n\n")}`);
});
