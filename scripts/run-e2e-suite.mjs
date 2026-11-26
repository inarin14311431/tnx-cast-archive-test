import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadWeights, planShards } from "./e2e-shard-plan.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(root, "tests/e2e/test-suites.json"), "utf8"));
const [groupName, projectOverride] = process.argv.slice(2);
const group = manifest.groups?.[groupName];

if (!groupName || !group) {
  console.error(`Unknown E2E suite: ${groupName || "<missing>"}`);
  console.error(`Available suites: ${Object.keys(manifest.groups || {}).join(", ")}`);
  process.exit(2);
}

const project = projectOverride || group.project;
const tests = Array.isArray(group.tests) ? group.tests : [];
if (!project || tests.length === 0) {
  console.error(`Invalid E2E suite configuration: ${groupName}`);
  process.exit(2);
}

// E2E_SHARD="2/4": run only the second of 4 shards. The CI splits the long suites this way. The spec files are dealt out by
// their run time (tests/e2e/shard-weights.json, scripts/e2e-shard-plan.mjs), not by Playwright's --shard, which cuts by the
// number of tests and so leaves the shards with very different times.
const shard = process.env.E2E_SHARD;
if (shard !== undefined && shard !== "" && !/^[1-9]\d*\/[1-9]\d*$/.test(shard)) {
  console.error(`E2E_SHARD must look like 2/4, got "${shard}"`);
  process.exit(2);
}

let selected = tests;
if (shard) {
  const [index, count] = shard.split("/").map(Number);
  if (index > count || tests.length < count) {
    console.error(`E2E_SHARD ${shard} does not fit the suite ${groupName} (${tests.length} spec files)`);
    process.exit(2);
  }
  const plan = planShards({ files: tests, weights: loadWeights(), count });
  selected = plan[index - 1].files;
  const unweighted = plan[index - 1].unweighted;
  console.log(`E2E shard ${index}/${count}: ${selected.length} of ${tests.length} spec files, about ${Math.round(plan[index - 1].seconds)} s by tests/e2e/shard-weights.json${unweighted.length ? ` (no weight yet, so the median is used: ${unweighted.join(", ")})` : ""}`);
}

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const args = ["playwright", "test", ...selected, `--project=${project}`];
const child = spawn(executable, args, {
  cwd: root,
  env: process.env,
  stdio: "inherit"
});

child.on("error", error => {
  console.error(error);
  process.exit(1);
});
child.on("exit", code => process.exit(code ?? 1));
