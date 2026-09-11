import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  root,
  loadEditorCachePolicy,
  collectEditorGraph,
  replacementsForVersionedTargets
} from "./editor-cache-version-lib.mjs";

const { version, entries, testFiles } = await loadEditorCachePolicy();
const { files, edges } = await collectEditorGraph(entries);
const { versionedTargets, replacements } = replacementsForVersionedTargets(edges, version);
const changed = [];

for (const [fileName, fileReplacements] of replacements) {
  let source = files.get(fileName);
  if (typeof source !== "string") continue;
  for (const [before, after] of fileReplacements) source = source.split(before).join(after);
  if (source === files.get(fileName)) continue;
  await writeFile(path.join(root, fileName), source, "utf8");
  changed.push(fileName);
}

for (const fileName of testFiles) {
  const filePath = path.join(root, fileName);
  const source = await readFile(filePath, "utf8");
  const normalized = source.replace(/([?&]v=)[A-Za-z0-9._-]+/g, `$1${version}`);
  if (normalized === source) continue;
  await writeFile(filePath, normalized, "utf8");
  changed.push(fileName);
}

if (changed.length) {
  console.log(`Normalized editor cache version to ${version} in ${changed.length} file(s):`);
  for (const file of [...new Set(changed)].sort()) console.log(`- ${file}`);
} else {
  console.log(`Editor cache versions already normalized to ${version}.`);
}
console.log(`Versioned editor targets: ${versionedTargets.size}; traversed files: ${files.size}; contract tests: ${testFiles.length}.`);
