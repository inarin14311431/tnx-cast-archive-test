/* Splits the spec files of an E2E suite into shards of about equal run time.
 *
 *   node scripts/e2e-shard-plan.mjs <group> <shard-count>        show the plan (what each shard would run)
 *   node scripts/e2e-shard-plan.mjs --weights-from <dir>...      print a new tests/e2e/shard-weights.json from the JSON reports
 *                                                                of one or more runs (one <dir> per run; the runs are averaged)
 *
 * Why not Playwright's own --shard: it cuts the ordered list of spec files into pieces with the same NUMBER of tests, so a
 * piece with a few slow specs takes several times longer than the others. Here each spec file has a weight (seconds, from
 * tests/e2e/shard-weights.json) and the files are dealt out longest first, always to the shard with the least work so far
 * (the "longest processing time" rule). The result depends only on the file list, the weights and the shard count, so every
 * shard job (and the aggregate job that checks them) computes the same plan.
 *
 * A spec file with no weight is not skipped: it gets the median weight of the others, so it still runs, in some shard.
 * scripts/summarize-e2e-shards.mjs checks that each shard ran exactly the files planned for it, and that together the shards
 * ran every test of the suite once.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const WEIGHTS_PATH = "tests/e2e/shard-weights.json";

export function loadWeights(file = path.join(root, WEIGHTS_PATH)) {
  return JSON.parse(readFileSync(file, "utf8")).files || {};
}

const usable = weight => Number.isFinite(weight) && weight > 0;

// The weight given to a spec file that has none: the median of the weights of the other files of the suite.
export function fallbackWeight(files, weights) {
  const known = files.map(file => weights[file]).filter(usable).sort((a, b) => a - b);
  return known.length ? known[Math.floor(known.length / 2)] : 1;
}

export function planShards({ files, weights = {}, count }) {
  if (!Number.isInteger(count) || count < 1) throw new Error(`the shard count must be a positive integer, got ${count}`);
  if (files.length < count) throw new Error(`cannot split ${files.length} spec file(s) into ${count} shards`);
  const fallback = fallbackWeight(files, weights);
  const items = files.map((file, index) => ({ file, index, known: usable(weights[file]), weight: usable(weights[file]) ? weights[file] : fallback }));
  const dealOrder = [...items].sort((a, b) => b.weight - a.weight || a.index - b.index);
  const shards = Array.from({ length: count }, () => ({ items: [], seconds: 0 }));
  for (const item of dealOrder) {
    let target = shards[0];
    for (const shard of shards) if (shard.seconds < target.seconds) target = shard;
    target.items.push(item);
    target.seconds += item.weight;
  }
  // Inside a shard the files keep the order of the suite list.
  return shards.map(shard => {
    const inOrder = [...shard.items].sort((a, b) => a.index - b.index);
    return { files: inOrder.map(item => item.file), seconds: shard.seconds, unweighted: inOrder.filter(item => !item.known).map(item => item.file) };
  });
}

// A Playwright JSON report names a spec file relative to the test directory ("a.spec.js"); the suite list says "tests/e2e/a.spec.js".
export const toSuitePath = file => (String(file).startsWith("tests/") ? String(file) : `tests/e2e/${file}`);

// Seconds spent per spec file in one JSON report (every attempt counts; the `setup` project is left out).
export function weightsFromReport(report) {
  const seconds = {};
  const walk = suite => {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        if (test.projectName === "setup") continue;
        const ms = (test.results || []).reduce((sum, result) => sum + (result.duration || 0), 0);
        const file = toSuitePath(spec.file);
        seconds[file] = (seconds[file] || 0) + ms / 1000;
      }
    }
    for (const child of suite.suites || []) walk(child);
  };
  for (const suite of report.suites || []) walk(suite);
  return seconds;
}

// One entry per run (each a { file: seconds } map, summed over that run's shard reports) -> the mean, in whole seconds (at least 1).
export function averageWeights(runs) {
  const files = new Set(runs.flatMap(run => Object.keys(run)));
  const result = {};
  for (const file of [...files].sort()) {
    const values = runs.map(run => run[file]).filter(usable);
    if (values.length) result[file] = Math.max(1, Math.round(values.reduce((a, b) => a + b, 0) / values.length));
  }
  return result;
}

function runWeightsFromDir(dir) {
  const total = {};
  const names = readdirSync(dir, { recursive: true }).map(String).filter(name => name.endsWith(".json"));
  if (!names.length) throw new Error(`no JSON report in ${dir}`);
  for (const name of names) {
    for (const [file, seconds] of Object.entries(weightsFromReport(JSON.parse(readFileSync(path.join(dir, name), "utf8"))))) total[file] = (total[file] || 0) + seconds;
  }
  return total;
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--weights-from") {
    if (args.length < 2) { console.error("usage: e2e-shard-plan.mjs --weights-from <dir>..."); process.exit(2); }
    const files = averageWeights(args.slice(1).map(runWeightsFromDir));
    const note = "Seconds each spec file takes (mean over the runs named in measuredFrom). Only used to split a suite into shards of about equal time; see scripts/e2e-shard-plan.mjs. A file missing here still runs (it gets the median weight).";
    console.log(JSON.stringify({ schemaVersion: 1, unit: "seconds", note, measuredFrom: `${args.length - 1} run(s), ${new Date().toISOString().slice(0, 10)}`, files }, null, 2));
    return;
  }
  const [group, countArg] = args;
  const count = Number(countArg);
  const manifest = JSON.parse(readFileSync(path.join(root, "tests/e2e/test-suites.json"), "utf8"));
  if (!manifest.groups?.[group] || !Number.isInteger(count) || count < 1) {
    console.error("usage: e2e-shard-plan.mjs <group> <shard-count>");
    process.exit(2);
  }
  const plan = planShards({ files: manifest.groups[group].tests, weights: loadWeights(), count });
  plan.forEach((shard, index) => {
    console.log(`shard ${index + 1}/${count}: ${shard.files.length} files, about ${Math.round(shard.seconds)} s${shard.unweighted.length ? ` (no weight yet: ${shard.unweighted.join(", ")})` : ""}`);
    for (const file of shard.files) console.log(`  ${file}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
