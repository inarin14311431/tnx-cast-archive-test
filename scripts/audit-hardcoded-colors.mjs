import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectColorCounts } from "./hardcoded-colors-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineFile = path.join(root, "scripts", "hardcoded-colors-baseline.json");
const UPDATE_HINT = "npm run audit:colors -- --update";

const current = await collectColorCounts(root);
const total = counts => Object.values(counts).reduce((sum, value) => sum + value, 0);

if (process.argv.includes("--update")) {
  const baseline = { schema: 1, files: current };
  await writeFile(baselineFile, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Hardcoded color baseline updated: ${Object.keys(current).length} files, ${total(current)} colors`);
  process.exit(0);
}

const baseline = JSON.parse(await readFile(baselineFile, "utf8")).files ?? {};
const files = [...new Set([...Object.keys(current), ...Object.keys(baseline)])].sort();
const above = files.filter(file => (current[file] ?? 0) > (baseline[file] ?? 0));
const below = files.filter(file => (current[file] ?? 0) < (baseline[file] ?? 0));

if (process.argv.includes("--verbose")) {
  for (const file of files) console.log(`${String(baseline[file] ?? 0).padStart(4)} -> ${String(current[file] ?? 0).padStart(4)}  ${file}`);
}

if (above.length) {
  for (const file of above) console.error(`Hardcoded colors increased: ${file} ${baseline[file] ?? 0} -> ${current[file]}`);
  console.error(`Use a theme token (var(--color-*)) instead of #hex/rgb()/hsl(). If the new color is intentional, run "${UPDATE_HINT}" and say why in the PR.`);
  process.exit(1);
}

const note = below.length ? `; ${below.length} file(s) below baseline - run "${UPDATE_HINT}" to lock in the reduction` : "";
console.log(`Hardcoded color audit: ${Object.keys(current).length} files, ${total(current)} colors, none above baseline${note}`);
