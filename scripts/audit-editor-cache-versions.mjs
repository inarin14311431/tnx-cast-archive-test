import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  root,
  loadEditorCachePolicy,
  collectEditorGraph,
  replacementsForVersionedTargets
} from "./editor-cache-version-lib.mjs";

const { version, entries, testFiles } = await loadEditorCachePolicy();
const combined = await collectEditorGraph(entries);
const { versionedTargets } = replacementsForVersionedTargets(combined.edges, version);
const problems = [];

for (const edge of combined.edges) {
  if (!versionedTargets.has(edge.to)) continue;
  if (edge.version === null) {
    problems.push(`${edge.from}: ${edge.raw} references versioned target ${edge.to} without ?v=${version}`);
  } else if (edge.version !== version) {
    problems.push(`${edge.from}: ${edge.raw} uses v=${edge.version}; expected v=${version}`);
  }
}

const perTarget = new Map();
for (const edge of combined.edges) {
  if (!versionedTargets.has(edge.to)) continue;
  if (!perTarget.has(edge.to)) perTarget.set(edge.to, new Set());
  perTarget.get(edge.to).add(edge.version ?? "<none>");
}
for (const [target, versions] of perTarget) {
  if (versions.size > 1) problems.push(`${target}: inconsistent editor versions ${[...versions].join(", ")}`);
}

const graphs = new Map();
for (const entry of entries) graphs.set(entry, await collectEditorGraph([entry]));
let sharedTargets = 0;
if (entries.length >= 2) {
  const [first, second] = entries;
  const firstTargets = new Set(graphs.get(first).edges.map(edge => edge.to));
  const secondTargets = new Set(graphs.get(second).edges.map(edge => edge.to));
  for (const target of firstTargets) {
    if (!secondTargets.has(target)) continue;
    sharedTargets += 1;
    const versions = new Set(combined.edges.filter(edge => edge.to === target).map(edge => edge.version ?? "<none>"));
    if (versions.size > 1) problems.push(`${target}: PC/mobile shared module version mismatch ${[...versions].join(", ")}`);
  }
}

for (const fileName of testFiles) {
  const source = await readFile(path.join(root, fileName), "utf8");
  for (const match of source.matchAll(/[?&]v=([A-Za-z0-9._-]+)/g)) {
    if (match[1] !== version) problems.push(`${fileName}: test cache token v=${match[1]}; expected v=${version}`);
  }
}

if (problems.length) {
  console.error("Editor cache version audit failed:\n" + problems.map(problem => `- ${problem}`).join("\n"));
  process.exit(1);
}

console.log(`Editor cache version audit passed: v=${version}, ${versionedTargets.size} versioned targets, ${sharedTargets} PC/mobile shared targets, ${combined.files.size} reachable files, ${testFiles.length} contract tests.`);
