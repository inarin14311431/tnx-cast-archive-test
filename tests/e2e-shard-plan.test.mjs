import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { averageWeights, fallbackWeight, loadWeights, planShards, toSuitePath, weightsFromReport } from "../scripts/e2e-shard-plan.mjs";
import { compareShardPlan } from "../scripts/summarize-e2e-shards.mjs";

const manifest = JSON.parse(await readFile(new URL("./e2e/test-suites.json", import.meta.url), "utf8"));
const suiteFiles = manifest.groups["ci-act-showcase"].tests;
const weights = loadWeights();
const workflow = await readFile(new URL("../.github/workflows/playwright.yml", import.meta.url), "utf8");
const shardCount = Number(workflow.match(/E2E_SHARD: \$\{\{ matrix\.shard \}\}\/(\d+)/)[1]);

test("planShards: 全ファイルがちょうど1つのシャードに入り、シャード内はスイートの並び順", () => {
  const plan = planShards({ files: suiteFiles, weights, count: shardCount });
  assert.equal(plan.length, shardCount);
  assert.deepEqual([...plan.flatMap(shard => shard.files)].sort(), [...suiteFiles].sort());
  for (const shard of plan) {
    assert.ok(shard.files.length > 0);
    assert.deepEqual(shard.files, suiteFiles.filter(file => shard.files.includes(file)));
  }
});

test("planShards: 同じ入力なら同じ割り振り(各シャードのジョブと集約ジョブが同じ計画を作る)", () => {
  const first = planShards({ files: suiteFiles, weights, count: shardCount });
  const second = planShards({ files: [...suiteFiles], weights: { ...weights }, count: shardCount });
  assert.deepEqual(second, first);
});

test("planShards: 重いファイルから順に、いちばん軽いシャードへ配る(最長と最短の差は、いちばん重い1ファイル以下)", () => {
  const plan = planShards({ files: suiteFiles, weights, count: shardCount });
  const seconds = plan.map(shard => shard.seconds);
  const heaviest = Math.max(...Object.values(weights));
  assert.ok(Math.max(...seconds) - Math.min(...seconds) <= heaviest, `spread ${seconds.join(", ")}`);
  // 3つに割った Playwright の --shard は 12分33秒 / 16分21秒 / 5分00秒 だった。重みが今の割り振りの目標(約12分)を守る
  assert.ok(Math.max(...seconds) <= 12 * 60 - 30, `longest shard by weights: ${Math.max(...seconds)} s`);
});

test("planShards: 重みの無いファイルも漏れず、中央値の重みで、どこかのシャードに入る", () => {
  const files = ["a", "b", "c", "d", "e", "new-spec"];
  const known = { a: 100, b: 60, c: 40, d: 20, e: 10 };
  assert.equal(fallbackWeight(files, known), 40);
  const plan = planShards({ files, weights: known, count: 2 });
  assert.deepEqual([...plan.flatMap(shard => shard.files)].sort(), [...files].sort());
  assert.deepEqual(plan.flatMap(shard => shard.unweighted), ["new-spec"]);
  // 重みが1つも無くても全部入る(件数で均等になる)
  const blind = planShards({ files, weights: {}, count: 3 });
  assert.deepEqual([...blind.flatMap(shard => shard.files)].sort(), [...files].sort());
  assert.deepEqual(blind.map(shard => shard.files.length), [2, 2, 2]);
  // 0・負・数でない重みは「無い」扱い
  assert.deepEqual(planShards({ files: ["x", "y"], weights: { x: 0, y: -3 }, count: 2 }).map(shard => shard.files.length), [1, 1]);
});

test("planShards: ファイル数よりシャードが多い・シャード数が不正なら、黙って欠けさせず失敗する", () => {
  assert.throws(() => planShards({ files: ["a"], weights: {}, count: 2 }), /cannot split 1 spec file/);
  assert.throws(() => planShards({ files: ["a"], weights: {}, count: 0 }), /positive integer/);
});

test("重みの表: ファイル名はスイートにあるものだけ(消した・改名した spec が残らない)で、重みは正の数", () => {
  const all = new Set(Object.values(manifest.groups).flatMap(group => group.tests));
  for (const [file, seconds] of Object.entries(weights)) {
    assert.ok(all.has(file), `${file} is in shard-weights.json but in no suite`);
    assert.ok(Number.isFinite(seconds) && seconds > 0, `${file}: ${seconds}`);
  }
});

test("重みの表: ci-act-showcase の spec は全部載っている(載せ忘れは、割り振りが偏る前にここで気づく)", () => {
  const missing = suiteFiles.filter(file => !(file in weights));
  assert.deepEqual(missing, [], "add the new spec to tests/e2e/shard-weights.json (any rough number works; refresh the table from the JSON reports later)");
});

test("weightsFromReport: spec ファイルごとに全試行の秒を足し、setup は数えず、ファイル名はスイートの形にする", () => {
  const report = { suites: [{ specs: [], suites: [{ specs: [
    { file: "a.spec.js", tests: [{ projectName: "chromium", results: [{ duration: 1500 }, { duration: 500 }] }] },
    { file: "a.spec.js", tests: [{ projectName: "chromium", results: [{ duration: 2000 }] }] },
    { file: "tests/e2e/b.spec.js", tests: [{ projectName: "chromium", results: [{ duration: 700 }] }] },
    { file: "auth.setup.js", tests: [{ projectName: "setup", results: [{ duration: 9000 }] }] }
  ], suites: [] }] }] };
  assert.deepEqual(weightsFromReport(report), { "tests/e2e/a.spec.js": 4, "tests/e2e/b.spec.js": 0.7 });
  assert.equal(toSuitePath("x.spec.js"), "tests/e2e/x.spec.js");
  assert.equal(toSuitePath("tests/e2e/x.spec.js"), "tests/e2e/x.spec.js");
});

test("averageWeights: 複数の実行の平均を、1秒以上の整数にする", () => {
  assert.deepEqual(averageWeights([{ a: 10, b: 0.2 }, { a: 20, c: 5 }]), { a: 15, b: 1, c: 5 });
});

test("compareShardPlan: 計画どおりのファイルを走らせたシャードだけが問題なし", () => {
  const plan = [{ files: ["tests/e2e/a.spec.js"] }, { files: ["tests/e2e/b.spec.js", "tests/e2e/c.spec.js"] }];
  const ran = (index, ...files) => ({ file: `shard-${index}.json`, index, tests: files.map(file => ({ id: `${file} :: t [chromium]` })) });
  assert.deepEqual(compareShardPlan({ plan, shards: [ran(1, "a.spec.js"), ran(2, "b.spec.js", "c.spec.js")] }), []);
  const swapped = compareShardPlan({ plan, shards: [ran(1, "b.spec.js"), ran(2, "c.spec.js")] }).join("\n");
  assert.match(swapped, /shard 1 ran files that are not in its plan \(1\): tests\/e2e\/b\.spec\.js/);
  assert.match(swapped, /shard 1 did not run files of its plan \(1\): tests\/e2e\/a\.spec\.js/);
  assert.match(swapped, /shard 2 did not run files of its plan \(1\): tests\/e2e\/b\.spec\.js/);
  assert.match(compareShardPlan({ plan, shards: [{ file: "report.json", index: NaN, tests: [] }] }).join("\n"), /cannot tell which shard report report\.json is/);
  assert.match(compareShardPlan({ plan, shards: [ran(3, "a.spec.js")] }).join("\n"), /cannot tell which shard report shard-3\.json is/);
});

test("run-e2e-suite: 番号がシャード数より大きい・シャード数がファイル数より多い E2E_SHARD は、走らせずに止まる", () => {
  for (const shard of ["5/4", "1/999"]) {
    const result = spawnSync(process.execPath, ["scripts/run-e2e-suite.mjs", "ci-act-showcase"], { cwd: new URL("..", import.meta.url), env: { ...process.env, E2E_SHARD: shard }, encoding: "utf8" });
    assert.equal(result.status, 2, shard);
    assert.match(result.stderr, /does not fit the suite ci-act-showcase/);
  }
});

test("ワークフロー: シャードのジョブは Playwright の --shard ではなく E2E_SHARD で計画を使う", () => {
  const commands = workflow.split("\n").filter(line => !line.trim().startsWith("#")).join("\n");
  assert.doesNotMatch(commands, /--shard/);
  assert.match(workflow, /run: npm run e2e:ci-act-showcase/);
});
