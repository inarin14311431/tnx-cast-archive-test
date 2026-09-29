import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runnerScript = path.join(root, "scripts/run-visual-regression.mjs");
const fakePlaywrightRunner = path.join(root, "tests/fixtures/fake-playwright-runner.mjs");

async function runWithFakePlaywright({ desktopExitCode, mobileExitCode }) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "visual-regression-test-"));
  const markerFile = path.join(tempDir, "invocations.log");
  try {
    const result = spawnSync(process.execPath, [runnerScript], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        VISUAL_REGRESSION_TEST_RUNNER: fakePlaywrightRunner,
        FAKE_RUNNER_MARKER_FILE: markerFile,
        FAKE_RUNNER_DESKTOP_EXIT_CODE: String(desktopExitCode),
        FAKE_RUNNER_MOBILE_EXIT_CODE: String(mobileExitCode)
      }
    });
    const invocations = await readFile(markerFile, "utf8").catch(() => "");
    return { status: result.status, invocations: invocations.trim().split("\n").filter(Boolean) };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

test("visual-mobile still runs when visual-desktop fails, and the overall exit code is a failure", async () => {
  const { status, invocations } = await runWithFakePlaywright({ desktopExitCode: 1, mobileExitCode: 0 });
  assert.deepEqual(invocations, ["visual-desktop", "visual-mobile"]);
  assert.notEqual(status, 0, "overall exit code must be a failure when desktop fails");
});

test("visual-desktop still runs and its failure is reported even if visual-mobile also fails", async () => {
  const { status, invocations } = await runWithFakePlaywright({ desktopExitCode: 1, mobileExitCode: 1 });
  assert.deepEqual(invocations, ["visual-desktop", "visual-mobile"]);
  assert.notEqual(status, 0);
});

test("both projects run and the overall exit code succeeds when both pass", async () => {
  const { status, invocations } = await runWithFakePlaywright({ desktopExitCode: 0, mobileExitCode: 0 });
  assert.deepEqual(invocations, ["visual-desktop", "visual-mobile"]);
  assert.equal(status, 0);
});
