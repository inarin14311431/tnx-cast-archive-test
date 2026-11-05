import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { collectTests, compareShards } from "../scripts/summarize-e2e-shards.mjs";

const report = (...specs) => ({ suites: [{ specs: specs.map(([file, title, projectName, status]) => ({ file, title, tests: [{ projectName, status }] })), suites: [] }] });

test("collectTests: setup プロジェクトは数えず、入れ子のスイートも拾う", () => {
  const nested = { suites: [{ specs: [], suites: [{ specs: [{ file: "a.spec.js", title: "t1", tests: [{ projectName: "chromium", status: "expected" }] }] }] },
    ...report(["auth.setup.js", "login", "setup", "expected"]).suites] };
  assert.deepEqual(collectTests(nested), [{ id: "a.spec.js :: t1 [chromium]", status: "expected" }]);
});

const shard = (...tests) => ({ tests: tests.map(([id, status = "expected"]) => ({ id, status })) });

test("compareShards: 全部が1回ずつ走ったら問題なし", () => {
  const result = compareShards({ expectedIds: ["a", "b", "c"], shards: [shard(["a"], ["b"]), shard(["c", "flaky"])] });
  assert.deepEqual(result, { problems: [], total: 3 });
});

test("compareShards: 走っていない・二重に走った・一覧に無い・落ちた・skip は問題にする", () => {
  const missing = compareShards({ expectedIds: ["a", "b"], shards: [shard(["a"])] });
  assert.match(missing.problems.join("\n"), /not run \(1\): b/);
  // 数が同じでも、1件が二重で別の1件が抜けていれば見つける
  const twice = compareShards({ expectedIds: ["a", "b"], shards: [shard(["a"]), shard(["a"])] });
  assert.equal(twice.total, 2);
  assert.match(twice.problems.join("\n"), /not run \(1\): b/);
  assert.match(twice.problems.join("\n"), /more than one shard \(1\): a/);
  assert.match(compareShards({ expectedIds: ["a"], shards: [shard(["a"], ["z"])] }).problems.join("\n"), /not in the suite list \(1\): z/);
  assert.match(compareShards({ expectedIds: ["a"], shards: [shard(["a", "unexpected"])] }).problems.join("\n"), /failed or skipped \(1\): a = unexpected/);
  assert.match(compareShards({ expectedIds: ["a"], shards: [shard(["a", "skipped"])] }).problems.join("\n"), /failed or skipped/);
});

test("run-e2e-suite: E2E_SHARD は 2/3 の形だけ受け付ける", () => {
  const result = spawnSync(process.execPath, ["scripts/run-e2e-suite.mjs", "ci-act-showcase"], { cwd: new URL("..", import.meta.url), env: { ...process.env, E2E_SHARD: "x/3" }, encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /E2E_SHARD must look like 2\/3/);
});

const workflow = await readFile(new URL("../.github/workflows/playwright.yml", import.meta.url), "utf8");
const section = name => {
  const start = workflow.indexOf(`\n  ${name}:\n`);
  const next = workflow.slice(start + 1).search(/\n {2}[a-z0-9-]+:\n/);
  return workflow.slice(start, next === -1 ? undefined : start + 1 + next);
};

test("ワークフロー: 必須チェック名 'Act showcase E2E' の集約ジョブが、シャードの失敗・取り消しでも判定する", () => {
  const aggregate = section("act-showcase");
  assert.match(aggregate, /^ {4}name: Act showcase E2E$/m);
  assert.match(aggregate, /needs: \[act-showcase-changes, act-showcase-shard\]/);
  assert.match(aggregate, /if: \$\{\{ always\(\) \}\}/);
  assert.match(aggregate, /node scripts\/summarize-e2e-shards\.mjs ci-act-showcase 3 shard-reports/);
  assert.match(aggregate, /exit 1/);
});

test("ワークフロー: シャード数は、matrix・E2E_SHARD・集約の引数で同じ", () => {
  const shardJob = section("act-showcase-shard");
  const matrix = shardJob.match(/shard: \[([\d, ]+)\]/)[1].split(",").map(value => Number(value.trim()));
  const count = matrix.length;
  assert.deepEqual(matrix, Array.from({ length: count }, (_, index) => index + 1));
  assert.match(shardJob, new RegExp(`E2E_SHARD: \\$\\{\\{ matrix\\.shard \\}\\}/${count}`));
  assert.match(shardJob, new RegExp(`name: Act showcase E2E shard \\$\\{\\{ matrix\\.shard \\}\\}/${count}`));
  assert.match(section("act-showcase"), new RegExp(`ci-act-showcase ${count} shard-reports`));
  assert.match(shardJob, /fail-fast: false/);
});
