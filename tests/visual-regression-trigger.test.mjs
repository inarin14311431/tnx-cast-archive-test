import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { visualRegressionNeeded } from "../scripts/visual-regression-needed.mjs";

test("画面比較: ドキュメントだけの変更は走らせない", () => {
  assert.equal(visualRegressionNeeded(["docs/CURRENT_STATE.md"]), false);
  assert.equal(visualRegressionNeeded(["docs/a/b.md", "docs/c.md", "README.md", "AGENTS.md"]), false);
});

test("画面比較: 描画に関わりうるファイルが1つでもあれば走らせる", () => {
  for (const file of ["js/act-showcase-page.js", "css-next/pages/act-showcase-core.css", "act-showcase.html", "assets/x.webp",
    "package.json", ".github/workflows/visual-regression.yml", "tests/e2e/server.mjs", "supabase/migrations/1.sql", "scripts/version-update.mjs"]) {
    assert.equal(visualRegressionNeeded(["docs/CURRENT_STATE.md", file]), true, file);
  }
});

test("画面比較: 変更が読めない・空のときは安全側で走らせる", () => {
  assert.equal(visualRegressionNeeded([]), true);
  assert.equal(visualRegressionNeeded(undefined), true);
});

test("画面比較: ワークフローは検出ジョブの失敗時にも比較を走らせる(必須チェックを素通りさせない)", async () => {
  const workflow = await readFile(new URL("../.github/workflows/visual-regression.yml", import.meta.url), "utf8");
  assert.match(workflow, /needs: visual-changes/);
  assert.match(workflow, /if: \$\{\{ always\(\) && needs\.visual-changes\.outputs\.run != 'false' \}\}/);
  assert.match(workflow, /name: Compare reference screenshots/);
  assert.doesNotMatch(workflow, /on:\s*\n\s*pull_request:\s*\n\s*paths/);
});
