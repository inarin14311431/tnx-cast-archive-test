import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(root, "css-next", "pages", "archive.css");
const original = await readFile(targetPath, "utf8");
const auditOnlyImport = '\n/* Audit-only reachability marker for ACT Showcase. */\n@import url("./act-showcase.css");\n';

try {
  if (!original.includes('@import url("./act-showcase.css")')) {
    await writeFile(targetPath, `${original.trimEnd()}${auditOnlyImport}`, "utf8");
  }
  await import(`${pathToFileURL(path.join(root, "scripts", "audit-css-rebuild.mjs")).href}?runner=2`);
} finally {
  await writeFile(targetPath, original, "utf8");
}
