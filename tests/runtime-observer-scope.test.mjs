import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifestUrl = new URL("../runtime-observer-manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

const broadObserverAllowlist = new Map([
  [
    "js/theme-scope.js",
    "Theme semantics must normalize dynamically injected dialogs and page fragments across the full body; this is the single reviewed body-wide observer exception."
  ]
]);

function broadObserverTargets(source) {
  const targets = [];
  const directPatterns = [
    [/\.observe\(\s*document\.body\b/g, "document.body"],
    [/\.observe\(\s*document\.documentElement\b/g, "document.documentElement"],
    [/\.observe\(\s*document\s*[,)]/g, "document"]
  ];
  for (const [pattern, label] of directPatterns) {
    if (pattern.test(source)) targets.push(label);
  }

  const aliases = new Map();
  for (const match of source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.(body|documentElement)\b/g)) {
    aliases.set(match[1], `document.${match[2]}`);
  }
  for (const match of source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.querySelector\(\s*["'](?:body|html)["']\s*\)/g)) {
    aliases.set(match[1], "document body/html query");
  }
  for (const [name, label] of aliases) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\.observe\\(\\s*${escaped}\\b`).test(source)) targets.push(`${name} -> ${label}`);
  }
  return targets;
}

test("MutationObserver inventory is explicit and every listed module still owns an observer", async () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(Array.isArray(manifest.files));
  assert.equal(new Set(manifest.files).size, manifest.files.length, "observer manifest must not contain duplicates");

  for (const file of manifest.files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /new\s+MutationObserver\s*\(/, `${file} is stale in runtime-observer-manifest.json`);
  }
});

test("body/document-wide MutationObservers require an explicit reviewed exception", async () => {
  const violations = [];
  const observedAllowlist = new Set();

  for (const file of manifest.files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    const broadTargets = broadObserverTargets(source);
    if (!broadTargets.length) continue;
    if (broadObserverAllowlist.has(file)) {
      observedAllowlist.add(file);
      continue;
    }
    violations.push(`${file}: ${broadTargets.join(", ")}`);
  }

  assert.deepEqual(
    violations,
    [],
    `Unreviewed broad MutationObserver target(s):\n${violations.join("\n")}`
  );

  for (const [file, rationale] of broadObserverAllowlist) {
    assert.ok(rationale.length >= 40, `${file} broad-observer exception requires a concrete rationale`);
    assert.ok(observedAllowlist.has(file), `${file} no longer needs its broad-observer exception; remove the allowlist entry`);
  }
});

test("observer inventory documents the no-polling replacement policy", () => {
  assert.match(manifest.policy, /MutationObserver/);
  assert.doesNotMatch(manifest.policy, /polling is preferred/i);
});
