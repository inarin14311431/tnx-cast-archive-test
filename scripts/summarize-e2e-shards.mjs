/* Checks that the sharded runs of an E2E suite ran every test, once.
 *
 *   node scripts/summarize-e2e-shards.mjs <group> <expected-shard-count> <dir-with-the-shard-json-reports>
 *
 * Each shard writes a Playwright JSON report. This counts the tests in them (the `setup` project, which every shard runs, is
 * left out), compares the sum with what `playwright test --list` finds for the whole suite, and compares the test titles, so
 * "the same number" cannot hide a test that ran twice while another did not run. Writes a table to $GITHUB_STEP_SUMMARY.
 * Exits 1 on any difference, on a missing shard, and on a failed or skipped test.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function collectTests(report) {
  const tests = [];
  const walk = (suite) => {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        if (test.projectName === "setup") continue;
        tests.push({ id: `${spec.file} :: ${spec.title} [${test.projectName}]`, status: test.status });
      }
    }
    for (const child of suite.suites || []) walk(child);
  };
  for (const suite of report.suites || []) walk(suite);
  return tests;
}

export function compareShards({ expectedIds, shards }) {
  const problems = [];
  const seen = new Map();
  for (const shard of shards) {
    for (const test of shard.tests) seen.set(test.id, (seen.get(test.id) || 0) + 1);
  }
  const expected = new Set(expectedIds);
  const missing = [...expected].filter(id => !seen.has(id));
  const extra = [...seen.keys()].filter(id => !expected.has(id));
  const twice = [...seen].filter(([, count]) => count > 1).map(([id]) => id);
  if (missing.length) problems.push(`not run (${missing.length}): ${missing.slice(0, 5).join(" | ")}`);
  if (extra.length) problems.push(`run but not in the suite list (${extra.length}): ${extra.slice(0, 5).join(" | ")}`);
  if (twice.length) problems.push(`run in more than one shard (${twice.length}): ${twice.slice(0, 5).join(" | ")}`);
  const bad = shards.flatMap(shard => shard.tests.filter(test => test.status !== "expected" && test.status !== "flaky"));
  if (bad.length) problems.push(`failed or skipped (${bad.length}): ${bad.slice(0, 5).map(test => `${test.id} = ${test.status}`).join(" | ")}`);
  return { problems, total: [...seen.values()].reduce((a, b) => a + b, 0) };
}

function listSuite(group, manifest) {
  const { tests, project } = manifest.groups[group];
  const output = execFileSync("npx", ["playwright", "test", "--list", "--reporter=json", ...tests, `--project=${project}`], {
    cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: "" }
  });
  return collectTests(JSON.parse(output)).map(test => test.id);
}

function main() {
  const [group, shardCountArg, dir] = process.argv.slice(2);
  const shardCount = Number(shardCountArg);
  if (!group || !Number.isInteger(shardCount) || shardCount < 1 || !dir) {
    console.error("usage: summarize-e2e-shards.mjs <group> <shard-count> <dir>");
    process.exit(2);
  }
  const manifest = JSON.parse(readFileSync(path.join(root, "tests/e2e/test-suites.json"), "utf8"));
  const files = readdirSync(dir, { recursive: true }).filter(name => String(name).endsWith(".json")).map(name => path.join(dir, String(name)));
  const shards = files.map(file => {
    const report = JSON.parse(readFileSync(file, "utf8"));
    const tests = collectTests(report);
    return { file: path.basename(file), tests, duration: Math.round((report.stats?.duration || 0) / 1000), flaky: tests.filter(test => test.status === "flaky") };
  });

  const expectedIds = listSuite(group, manifest);
  const { problems, total } = compareShards({ expectedIds, shards });
  if (shards.length !== shardCount) problems.unshift(`expected ${shardCount} shard report(s), found ${shards.length}`);

  const lines = [
    `### ${group}: ${shards.length}/${shardCount} shards, ${total} tests run, ${expectedIds.length} in the suite (\`playwright test --list\`)`,
    "",
    "| shard report | tests | time (s) | flaky (passed on retry) |",
    "|---|---|---|---|",
    ...shards.map(shard => `| ${shard.file} | ${shard.tests.length} | ${shard.duration} | ${shard.flaky.length} |`),
    "",
    problems.length ? problems.map(problem => `- **NG** ${problem}`).join("\n") : "- every test of the suite ran exactly once, and none failed or was skipped"
  ];
  const flaky = shards.flatMap(shard => shard.flaky);
  if (flaky.length) lines.push("", "Passed only on retry:", ...flaky.map(test => `- ${test.id}`));
  const text = lines.join("\n");
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  if (problems.length) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
