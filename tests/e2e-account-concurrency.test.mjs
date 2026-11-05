import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// The shared test-owner account (E2E_EMAIL) must not be used by two runs at the same time. Only the jobs that are given the
// account need a concurrency group; a workflow-level group makes every run wait for the long jobs that never touch it.
const workflow = await readFile(new URL("../.github/workflows/playwright.yml", import.meta.url), "utf8");

function jobs() {
  const body = workflow.slice(workflow.indexOf("\njobs:") + 1);
  const result = {};
  let current = null;
  for (const line of body.split("\n").slice(1)) {
    const header = line.match(/^ {2}([a-z0-9-]+):\s*$/);
    if (header) { current = header[1]; result[current] = []; continue; }
    if (current) result[current].push(line);
  }
  return Object.fromEntries(Object.entries(result).map(([name, lines]) => [name, lines.join("\n")]));
}

test("共有アカウントを渡すジョブは、それぞれ専用の concurrency グループを持つ", () => {
  const withAccount = Object.entries(jobs()).filter(([, text]) => /secrets\.E2E_(EMAIL|PASSWORD)/.test(text));
  assert.deepEqual(withAccount.map(([name]) => name).sort(), ["authenticated-editor", "mobile"]);
  const groups = [];
  for (const [name, text] of withAccount) {
    const group = text.match(/^ {4}concurrency:\n {6}group: (\S+)\n {6}cancel-in-progress: false$/m);
    assert.ok(group, `${name} needs its own concurrency group (cancel-in-progress: false)`);
    groups.push(group[1]);
  }
  assert.equal(new Set(groups).size, groups.length, "two jobs of one run must not share a group (a pending job would be cancelled)");
});

test("共有アカウントを渡さないジョブとワークフロー全体には concurrency を付けない", () => {
  assert.doesNotMatch(workflow.split("\njobs:")[0].replace(/^#.*$/gm, ""), /concurrency:/);
  for (const [name, text] of Object.entries(jobs())) {
    if (/secrets\.E2E_(EMAIL|PASSWORD)/.test(text)) continue;
    assert.doesNotMatch(text, /^ {4}concurrency:/m, `${name} does not use the account`);
  }
});

test("必須チェックの名前(ジョブ名)は変えない", () => {
  for (const name of ["Public and smoke E2E", "Act showcase E2E", "Authenticated editor E2E", "Mobile E2E"]) {
    assert.match(workflow, new RegExp(`^ {4}name: ${name}$`, "m"));
  }
});
