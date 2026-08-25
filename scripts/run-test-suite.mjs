import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = path.join(root, "tests");

// Presentation contracts assert CSS/layout/readability details. They are useful
// guardrails, but are intentionally separated from the core functional loop
// because Playwright Visual Regression owns the final rendered appearance.
// Behavioral helpers stay in core even when they affect the rendered result.
const presentationTests = new Set([
  "account-actions-presentation.test.mjs",
  "combo-section-hover-contract.test.mjs",
  "mobile-touch-targets.test.mjs",
  "post-transfer-dialog-size-contract.test.mjs",
  "quick-sheet-layout-boundary.test.mjs",
  "sheet-mobile-nav-layout.test.mjs",
  "sheet-mobile-ux-pass.test.mjs",
  "style-skill-view-multiline.test.mjs",
  "ui-readability-contract.test.mjs"
]);

const suite = process.argv[2] ?? "core";
if (!["core", "presentation", "all"].includes(suite)) {
  console.error(`Unknown test suite: ${suite}`);
  process.exit(2);
}

const allTests = (await readdir(testsDir))
  .filter(name => name.endsWith(".test.mjs"))
  .sort();

const missing = [...presentationTests].filter(name => !allTests.includes(name));
if (missing.length > 0) {
  console.error(`Presentation test manifest contains missing files: ${missing.join(", ")}`);
  process.exit(2);
}

const selected = allTests.filter(name => {
  if (suite === "all") return true;
  if (suite === "presentation") return presentationTests.has(name);
  return !presentationTests.has(name);
});

console.log(`[tests] suite=${suite} files=${selected.length}/${allTests.length}`);

const child = spawn(
  process.execPath,
  ["--test", ...selected.map(name => path.join("tests", name))],
  { cwd: root, stdio: "inherit" }
);

child.on("exit", code => process.exit(code ?? 1));
child.on("error", error => {
  console.error(error);
  process.exit(1);
});
