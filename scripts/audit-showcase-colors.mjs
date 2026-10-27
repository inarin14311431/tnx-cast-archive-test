import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectShowcaseColorCounts } from "./hardcoded-colors-lib.mjs";

/* Ratchet for the hardcoded colors of the showcase files (audit:colors does not count them: their paths contain
 * "showcase"). The baseline freezes today's count per file: a file may go down, never up, and a showcase file that
 * is not in the baseline (a new one, e.g. the CSS of a pattern B/C) has to have 0 hardcoded colors - it takes its
 * colors from the theme variables. Counting rules: scripts/hardcoded-colors-lib.mjs. */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineFile = path.join(root, "scripts", "showcase-hardcoded-colors-baseline.json");
const UPDATE_HINT = "npm run audit:showcase-colors -- --update";

const current = await collectShowcaseColorCounts(root);
const total = counts => Object.values(counts).reduce((sum, value) => sum + value, 0);

if (process.argv.includes("--update")) {
  await writeFile(baselineFile, `${JSON.stringify({ schema: 1, files: current }, null, 2)}\n`);
  console.log(`Showcase color baseline updated: ${Object.keys(current).length} files, ${total(current)} colors`);
  process.exit(0);
}

const baseline = JSON.parse(await readFile(baselineFile, "utf8")).files ?? {};
const files = [...new Set([...Object.keys(current), ...Object.keys(baseline)])].sort();
const newFilesWithColors = files.filter(file => !(file in baseline) && (current[file] ?? 0) > 0);
const above = files.filter(file => file in baseline && (current[file] ?? 0) > baseline[file]);
const below = files.filter(file => file in baseline && (current[file] ?? 0) < baseline[file]);

if (process.argv.includes("--verbose")) {
  for (const file of files) console.log(`${String(baseline[file] ?? "-").padStart(4)} -> ${String(current[file] ?? 0).padStart(4)}  ${file}`);
}

if (newFilesWithColors.length || above.length) {
  for (const file of newFilesWithColors) console.error(`New showcase file with hardcoded colors: ${file} (${current[file]}); a new showcase file starts at 0`);
  for (const file of above) console.error(`Showcase hardcoded colors increased: ${file} ${baseline[file]} -> ${current[file]}`);
  console.error("Use the theme variables (var(--showcase-*)) instead of #hex/rgb()/hsl(). Do not raise the baseline to make this pass.");
  process.exit(1);
}

const note = below.length ? `; ${below.length} file(s) below baseline - run "${UPDATE_HINT}" to lock in the reduction` : "";
console.log(`Showcase color audit: ${Object.keys(current).length} files, ${total(current)} colors, none above baseline${note}`);
