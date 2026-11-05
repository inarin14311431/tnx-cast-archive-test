/* Decides whether the visual regression compare has to run for a pull request.
 *
 *   node scripts/visual-regression-needed.mjs
 *
 * The compare takes the whole site's rendering as its input, so it is skipped only when EVERY changed file is known to
 * have no effect on rendering (documents). Anything else, an empty list, an unreadable diff, or any event other than
 * pull_request runs the compare. Writes `run=true|false` to $GITHUB_OUTPUT; the workflow skips the job with `if`, because
 * filtering the whole workflow with on.pull_request.paths would leave the required check pending.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { matchesAny } from "./e2e-changed-groups.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Documents only. Tests and scripts are not listed: tests/e2e/server.mjs, for one, serves the pages the compare opens.
export const NO_VISUAL_EFFECT_PATHS = ["docs/**", "*.md"];

export function visualRegressionNeeded(files) {
  if (!Array.isArray(files) || files.length === 0) return true;
  return files.some(file => !matchesAny(NO_VISUAL_EFFECT_PATHS, file));
}

function changedFilesOfPullRequest() {
  const output = execFileSync("git", ["diff", "--name-only", "HEAD^1", "HEAD"], { cwd: root, encoding: "utf8" });
  return output.split("\n").map(line => line.trim()).filter(Boolean);
}

function main() {
  let run = true;
  let reason;
  if (process.env.GITHUB_EVENT_NAME !== "pull_request") {
    reason = `event ${process.env.GITHUB_EVENT_NAME || "(local)"}: always run`;
  } else {
    try {
      const files = changedFilesOfPullRequest();
      run = visualRegressionNeeded(files);
      reason = run
        ? `${files.filter(file => !matchesAny(NO_VISUAL_EFFECT_PATHS, file)).length} of ${files.length} changed file(s) can change rendering`
        : `all ${files.length} changed file(s) are documents`;
    } catch (error) {
      reason = `could not read the changed files (${error.message.split("\n")[0]}): run to be safe`;
    }
  }
  console.log(`visual-regression: run=${run} (${reason})`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
