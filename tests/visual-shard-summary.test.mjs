import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compareVisualRun } from "../scripts/summarize-visual-shards.mjs";
import { VISUAL_RUNS, playwrightArgs } from "../scripts/visual-runs.mjs";

const run = { label: "visual-desktop", leftOut: ["b.spec.js/skip.png"] };
const log = (...tests) => ({ tests: tests.map(([file, title, shots, status = "passed"]) => ({ file, title, status, screenshots: shots.map(name => ({ name, ok: true })) })) });

test("compareVisualRun: 全テストが走り、全基準画像が1回ずつ比べられていれば問題なし(意図して除く画像は除く)", () => {
  const result = compareVisualRun({
    run, listIds: ["a.spec.js :: t1", "a.spec.js :: t2"], baselineFiles: ["a.spec.js/x.png", "a.spec.js/y.png", "b.spec.js/skip.png"],
    log: log(["a.spec.js", "t1", ["x.png"]], ["a.spec.js", "t2", ["y.png"]])
  });
  assert.deepEqual(result.problems, []);
  assert.deepEqual([result.tests, result.listed, result.compared, result.baseline, result.leftOut], [2, 2, 2, 3, ["b.spec.js/skip.png"]]);
});

test("compareVisualRun: 比べていない基準画像・基準の無い比較・二重・落ちた・skip・名前なしを見つける", () => {
  const base = { run, listIds: ["a.spec.js :: t1", "a.spec.js :: t2"], baselineFiles: ["a.spec.js/x.png", "a.spec.js/y.png"] };
  const problems = overrides => compareVisualRun({ ...base, ...overrides }).problems.join("\n");
  assert.match(problems({ log: log(["a.spec.js", "t1", ["x.png"]], ["a.spec.js", "t2", []]) }), /baseline images not compared \(1\): a\.spec\.js\/y\.png/);
  assert.match(problems({ log: log(["a.spec.js", "t1", ["x.png", "z.png"]], ["a.spec.js", "t2", ["y.png"]]) }), /compared without a baseline image \(1\): a\.spec\.js\/z\.png/);
  assert.match(problems({ log: log(["a.spec.js", "t1", ["x.png"]], ["a.spec.js", "t2", ["x.png"]]) }), /compared more than once/);
  assert.match(problems({ log: log(["a.spec.js", "t1", ["x.png"]]) }), /tests not run \(1\): a\.spec\.js :: t2/);
  assert.match(problems({ log: log(["a.spec.js", "t1", ["x.png"]], ["a.spec.js", "t2", ["y.png"], "failed"]) }), /not passed \(1\): t2 = failed/);
  assert.match(problems({ log: log(["a.spec.js", "t1", ["x.png"]], ["a.spec.js", "t2", ["y.png"], "timedOut"]) }), /not passed \(1\): t2 = timedOut/);
  // 設計上の skip(画像なし)は問題にしない。ただし skip が基準画像の比較を隠せば、比べていない画像として見つかる
  const byDesign = compareVisualRun({ ...base, baselineFiles: ["a.spec.js/x.png"], listIds: ["a.spec.js :: t1", "a.spec.js :: t2"], log: log(["a.spec.js", "t1", ["x.png"]], ["a.spec.js", "t2", [], "skipped"]) });
  assert.deepEqual([byDesign.problems, byDesign.skipped], [[], 1]);
  assert.match(problems({ log: log(["a.spec.js", "t1", ["x.png"]], ["a.spec.js", "t2", [], "skipped"]) }), /baseline images not compared \(1\): a\.spec\.js\/y\.png/);
  assert.match(problems({ log: log(["a.spec.js", "t1", [null]], ["a.spec.js", "t2", ["y.png"]]) }), /without a name/);
  assert.match(problems({ log: null }), /no compare log/);
});

test("visual-runs: デスクトップとモバイルの2つで、デスクトップだけ1テストを除く(従来どおり)", () => {
  assert.deepEqual(VISUAL_RUNS.map(item => item.label), ["visual-desktop", "visual-mobile"]);
  assert.deepEqual(playwrightArgs(VISUAL_RUNS[0]).slice(-2), ["--grep-invert", "キャスト閲覧 spectrum-neon"]);
  assert.ok(!playwrightArgs(VISUAL_RUNS[1]).includes("--grep-invert"));
});

test("run-visual-regression: VISUAL_PROJECT で1つだけ走らせる。知らない値は断る", () => {
  const withEnv = env => spawnSync(process.execPath, ["scripts/run-visual-regression.mjs"], { cwd: new URL("..", import.meta.url), encoding: "utf8",
    env: { ...process.env, VISUAL_REGRESSION_TEST_RUNNER: new URL("./fixtures/fake-playwright-runner.mjs", import.meta.url).pathname, ...env } });
  assert.equal(withEnv({ VISUAL_PROJECT: "visual-tablet" }).status, 2);
  assert.equal(withEnv({ VISUAL_PROJECT: "visual-mobile" }).status, 0);
});

const workflow = await readFile(new URL("../.github/workflows/visual-regression.yml", import.meta.url), "utf8");
const section = name => {
  const start = workflow.indexOf(`\n  ${name}:\n`);
  const next = workflow.slice(start + 1).search(/\n {2}[a-z0-9-]+:\n/);
  return workflow.slice(start, next === -1 ? undefined : start + 1 + next);
};

test("ワークフロー: 必須チェック名 'Compare reference screenshots' は集約ジョブが持ち、各プロジェクトの失敗でも判定する", () => {
  const aggregate = section("compare");
  assert.match(aggregate, /^ {4}name: Compare reference screenshots$/m);
  assert.match(aggregate, /needs: \[visual-changes, compare-shard\]/);
  assert.match(aggregate, /if: \$\{\{ always\(\) \}\}/);
  assert.match(aggregate, /node scripts\/summarize-visual-shards\.mjs/);
  assert.match(aggregate, /exit 1/);
});

test("ワークフロー: matrix のプロジェクトは VISUAL_RUNS と同じで、ログを残す", () => {
  const shard = section("compare-shard");
  const matrix = shard.match(/project: \[([^\]]+)\]/)[1].split(",").map(value => value.trim());
  assert.deepEqual(matrix, VISUAL_RUNS.map(item => item.label));
  assert.match(shard, /VISUAL_PROJECT: \$\{\{ matrix\.project \}\}/);
  assert.match(shard, /VISUAL_COMPARE_LOG_DIR: /);
  assert.match(shard, /fail-fast: false/);
});
