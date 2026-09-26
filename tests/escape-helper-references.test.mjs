import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

/* Regression for #419: cast-outfits.js called escapeAttributeWithNewlines(), which was
 * never defined. The ReferenceError aborted the outfit rebuild and left the legacy
 * English-only table from cast.js on screen. Every escape*() helper a runtime file
 * calls must be imported, declared or assigned in that same file. */
const jsRoot = new URL("../js/", import.meta.url);
const files = (await readdir(jsRoot)).filter(name => name.endsWith(".js"));

function definedNames(source) {
  const names = new Set();
  for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    for (const part of match[1].split(",")) {
      const alias = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (alias) names.add(alias);
    }
  }
  for (const match of source.matchAll(/(?:function\s+|(?:const|let|var)\s+|\b)(escape[A-Za-z0-9_]*)\s*(?:\(|=)/g)) {
    if (/^(?:function|const|let|var)\s/.test(match[0]) || /=\s*$/.test(match[0])) names.add(match[1]);
  }
  for (const match of source.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=/g)) {
    for (const part of match[1].split(",")) {
      const alias = part.trim().split(/\s*:\s*/).pop()?.trim();
      if (alias) names.add(alias);
    }
  }
  return names;
}

test("runtime files only call escape helpers they define or import", async () => {
  const problems = [];
  for (const name of files) {
    const source = await readFile(new URL(name, jsRoot), "utf8");
    const defined = definedNames(source);
    const called = new Set([...source.matchAll(/(?<![.\w$])(escape[A-Za-z0-9_]*)\s*\(/g)].map(match => match[1]));
    for (const helper of called) {
      if (helper === "escape") continue;
      if (!defined.has(helper)) problems.push(`js/${name}: ${helper}() is not defined or imported`);
    }
  }
  assert.deepEqual(problems, []);
});

test("cast outfit view uses its newline-safe attribute helper", async () => {
  const source = await readFile(new URL("cast-outfits.js", jsRoot), "utf8");
  assert.match(source, /title="\$\{escapeAttribute\(text\)\}"/);
  assert.match(source, /function escapeAttribute\(value\)/);
  assert.doesNotMatch(source, /escapeAttributeWithNewlines/);
});
