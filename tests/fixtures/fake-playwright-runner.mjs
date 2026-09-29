import { appendFileSync } from "node:fs";

const projectArg = process.argv.find(arg => arg.startsWith("--project="));
const project = projectArg ? projectArg.slice("--project=".length) : "unknown";
const outputArg = process.argv.find(arg => arg.startsWith("--output="));
const outputDir = outputArg ? outputArg.slice("--output=".length) : "";
const reportDir = process.env.PLAYWRIGHT_HTML_REPORT || "";

if (process.env.FAKE_RUNNER_MARKER_FILE) {
  appendFileSync(process.env.FAKE_RUNNER_MARKER_FILE, `${project}|${outputDir}|${reportDir}\n`);
}

const exitCodeVarName = project === "visual-desktop" ? "FAKE_RUNNER_DESKTOP_EXIT_CODE" : "FAKE_RUNNER_MOBILE_EXIT_CODE";
process.exit(Number(process.env[exitCodeVarName] || 0));
