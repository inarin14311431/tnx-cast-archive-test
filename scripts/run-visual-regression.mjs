import { spawnSync } from "node:child_process";

// Tests substitute a fake runner script (invoked via node) so CI's real
// desktop/mobile Playwright projects never have to actually run.
const testRunner = process.env.VISUAL_REGRESSION_TEST_RUNNER;
const executable = testRunner ? process.execPath : process.platform === "win32" ? "npx.cmd" : "npx";
const prefixArgs = testRunner ? [testRunner] : [];

const runs = [
  {
    label: "visual-desktop",
    args: [
      "playwright",
      "test",
      "--config=playwright.visual.config.js",
      "--project=visual-desktop",
      "--grep-invert",
      "キャスト閲覧 spectrum-neon"
    ]
  },
  {
    label: "visual-mobile",
    args: ["playwright", "test", "--config=playwright.visual.config.js", "--project=visual-mobile"]
  }
];

let exitCode = 0;

for (const run of runs) {
  const result = spawnSync(executable, [...prefixArgs, ...run.args], { stdio: "inherit" });
  if (result.error) {
    console.error(`[run-visual-regression] failed to start ${run.label}:`, result.error);
    exitCode = exitCode || 1;
    continue;
  }
  const code = result.status ?? 1;
  if (code !== 0) {
    console.error(`[run-visual-regression] ${run.label} exited with code ${code}`);
    exitCode = exitCode || code;
  }
}

process.exit(exitCode);
