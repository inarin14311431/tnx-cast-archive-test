import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync("showcase-generator.html", "utf8");
const loader = fs.readFileSync("js/showcase-generator-loader.js", "utf8");

function versionedImportIndex(source, moduleName) {
  const match = source.match(new RegExp(`${moduleName.replaceAll(".", "\\.")}\\?v=\\d+`));
  return match ? source.indexOf(match[0]) : -1;
}

test("ACT showcase publishing is a critical module loaded before optional enhancements", () => {
  const publishIndex = versionedImportIndex(loader, "showcase-dynamic-publish.js");
  const optionalIndex = loader.indexOf("const optionalModules");
  assert.ok(publishIndex >= 0, "dynamic publish module must be loaded with a cache version");
  assert.ok(optionalIndex >= 0, "optional module boundary must exist");
  assert.ok(publishIndex < optionalIndex, "publishing must initialize before optional modules");
  assert.match(loader, /Promise\.all\(optionalModules\.map/);
  assert.match(loader, /reportOptionalModuleError/);
});

test("ACT showcase generator uses an explicit observable bootstrap", () => {
  assert.match(loader, /async function initializeShowcaseGenerator\(\)/);
  assert.match(loader, /dataset\.showcaseGeneratorState = "loading"/);
  assert.match(loader, /dataset\.showcaseGeneratorState = "ready"/);
  assert.match(loader, /dataset\.showcaseGeneratorState = "error"/);
  assert.match(loader, /void initializeShowcaseGenerator\(\)/);
});

test("ACT showcase generator keeps outer and nested cache boundaries", () => {
  const outer = [...html.matchAll(/showcase-generator-loader\.js\?v=(\d+)/g)];
  const generator = [...loader.matchAll(/showcase-generator-v3\.js\?v=(\d+)/g)];
  const publisher = [...loader.matchAll(/showcase-dynamic-publish\.js\?v=(\d+)/g)];

  assert.equal(outer.length, 1, "outer loader must be referenced exactly once");
  assert.equal(generator.length, 1, "core generator must be imported exactly once");
  assert.equal(publisher.length, 1, "publisher must be imported exactly once");
  for (const match of [outer[0], generator[0], publisher[0]]) {
    assert.ok(Number(match[1]) >= 1, "cache boundaries must use numeric versions");
  }
});
