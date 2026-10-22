import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { contentVersion, planContentVersions, staleFiles, VERSION_LENGTH } from "../scripts/content-version-lib.mjs";

const FIXTURE = {
  "index.html": [
    '<link rel="stylesheet" href="./css-next/entry.css?v=1">',
    '<script src="https://cdn.example.test/lib.js?v=9"></script>',
    '<script src="./js/plain.js"></script>',
    '<script type="module" src="./js/app.js?v=1"></script>'
  ].join("\n"),
  "js/app.js": [
    'import { b } from "./b.js?v=old";',
    'import "./plain.js";',
    'export { c } from "./c.js?v=1";',
    'export const lazy = () => import("./lazy.js?v=3");',
    "export const value = b;"
  ].join("\n"),
  "js/b.js": "export const b = 1;\n",
  "js/c.js": "export const c = 2;\n",
  "js/lazy.js": "export default 3;\n",
  "js/plain.js": "window.plain = true;\n",
  "css-next/entry.css": '@import url("./part.css?v=2") layer(part);\n',
  "css-next/part.css": "body { color: red; }\n"
};

async function makeFixture(files) {
  const dir = await mkdtemp(path.join(tmpdir(), "content-versions-"));
  for (const [name, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, name)), { recursive: true });
    await writeFile(path.join(dir, name), content, "utf8");
  }
  return dir;
}

async function apply(dir) {
  const plan = await planContentVersions(dir);
  assert.deepEqual(plan.problems, []);
  const stale = staleFiles(plan);
  for (const item of stale) await writeFile(item.path, item.next, "utf8");
  return stale.map(item => item.file);
}

const read = (dir, name) => readFile(path.join(dir, name), "utf8");
const versionIn = (source, file) => source.match(new RegExp(`${file.replace(/[.]/g, "\\.")}\\?v=([^"'&#)]*)`))?.[1];

test("every versioned reference becomes the content hash of its target, children before parents", async t => {
  const dir = await makeFixture(FIXTURE);
  t.after(() => rm(dir, { recursive: true, force: true }));
  await apply(dir);

  const app = await read(dir, "js/app.js");
  const html = await read(dir, "index.html");
  const entry = await read(dir, "css-next/entry.css");
  assert.equal(versionIn(app, "b.js"), contentVersion(await read(dir, "js/b.js")));
  assert.equal(versionIn(app, "c.js"), contentVersion(await read(dir, "js/c.js")));
  assert.equal(versionIn(app, "lazy.js"), contentVersion(await read(dir, "js/lazy.js")));
  assert.equal(versionIn(entry, "part.css"), contentVersion(await read(dir, "css-next/part.css")));
  // the parent is hashed after its own references were rewritten
  assert.equal(versionIn(html, "app.js"), contentVersion(app));
  assert.equal(versionIn(html, "entry.css"), contentVersion(entry));
  assert.match(versionIn(html, "app.js"), new RegExp(`^[0-9a-f]{${VERSION_LENGTH}}$`));
});

test("running it again changes nothing (idempotent)", async t => {
  const dir = await makeFixture(FIXTURE);
  t.after(() => rm(dir, { recursive: true, force: true }));
  const first = await apply(dir);
  assert.ok(first.length > 0);
  const snapshot = await Promise.all(Object.keys(FIXTURE).map(name => read(dir, name)));
  assert.deepEqual(await apply(dir), []);
  assert.deepEqual(await Promise.all(Object.keys(FIXTURE).map(name => read(dir, name))), snapshot);
});

test("a change in a leaf moves its version and every versioned parent up to the HTML", async t => {
  const dir = await makeFixture(FIXTURE);
  t.after(() => rm(dir, { recursive: true, force: true }));
  await apply(dir);
  const before = { app: await read(dir, "js/app.js"), html: await read(dir, "index.html") };

  await writeFile(path.join(dir, "js/b.js"), "export const b = 2;\n", "utf8");
  assert.deepEqual((await apply(dir)).sort(), ["index.html", "js/app.js"]);
  const after = { app: await read(dir, "js/app.js"), html: await read(dir, "index.html") };
  assert.notEqual(versionIn(after.app, "b.js"), versionIn(before.app, "b.js"));
  assert.notEqual(versionIn(after.html, "app.js"), versionIn(before.html, "app.js"));
  assert.equal(versionIn(after.html, "entry.css"), versionIn(before.html, "entry.css"));
});

test("references without ?v= and external URLs are left as they are", async t => {
  const dir = await makeFixture(FIXTURE);
  t.after(() => rm(dir, { recursive: true, force: true }));
  await apply(dir);
  const html = await read(dir, "index.html");
  assert.match(html, /src="\.\/js\/plain\.js"/);
  assert.match(html, /lib\.js\?v=9"/);
  assert.match(await read(dir, "js/app.js"), /import "\.\/plain\.js";/);
});

test("a cycle among versioned references is reported and nothing is planned for its files", async t => {
  const dir = await makeFixture({
    "index.html": '<script type="module" src="./js/x.js?v=1"></script>',
    "js/x.js": 'import "./y.js?v=1";\n',
    "js/y.js": 'import "./x.js?v=1";\n'
  });
  t.after(() => rm(dir, { recursive: true, force: true }));
  const plan = await planContentVersions(dir);
  assert.equal(plan.problems.length, 1);
  assert.match(plan.problems[0], /^cycle among versioned references: js\/(x|y)\.js -> js\/(x|y)\.js -> js\/(x|y)\.js$/);
  assert.deepEqual(staleFiles(plan), []);
});

test("an unversioned edge does not form a cycle (only ?v= references feed the hash)", async t => {
  const dir = await makeFixture({
    "index.html": '<script type="module" src="./js/x.js?v=1"></script>',
    "js/x.js": 'import "./y.js?v=1";\n',
    "js/y.js": 'import "./x.js";\n'
  });
  t.after(() => rm(dir, { recursive: true, force: true }));
  assert.deepEqual((await planContentVersions(dir)).problems, []);
});

test("duplicate v= parameters and missing targets are reported", async t => {
  const dir = await makeFixture({
    "index.html": '<script type="module" src="./js/a.js?v=1&v=2"></script>\n<script src="./js/gone.js?v=1"></script>'
  });
  await mkdir(path.join(dir, "js"), { recursive: true });
  await writeFile(path.join(dir, "js/a.js"), "export {};\n", "utf8");
  t.after(() => rm(dir, { recursive: true, force: true }));
  const { problems } = await planContentVersions(dir);
  assert.ok(problems.some(problem => /duplicate v= parameters in \.\/js\/a\.js\?v=1&v=2/.test(problem)), problems.join("\n"));
  assert.ok(problems.some(problem => /missing local dependency: index\.html -> js\/gone\.js/.test(problem)), problems.join("\n"));
});
