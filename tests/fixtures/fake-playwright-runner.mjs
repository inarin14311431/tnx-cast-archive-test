import { appendFileSync } from "node:fs";

const projectArg = process.argv.find(arg => arg.startsWith("--project="));
const project = projectArg ? projectArg.slice("--project=".length) : "unknown";

if (process.env.FAKE_RUNNER_MARKER_FILE) {
  appendFileSync(process.env.FAKE_RUNNER_MARKER_FILE, `${project}\n`);
}

const exitCodeVarName = project === "visual-desktop" ? "FAKE_RUNNER_DESKTOP_EXIT_CODE" : "FAKE_RUNNER_MOBILE_EXIT_CODE";
process.exit(Number(process.env[exitCodeVarName] || 0));
