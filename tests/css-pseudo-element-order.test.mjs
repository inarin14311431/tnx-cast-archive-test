import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { cssStyleRules, splitSelectorList } from "./helpers/css-rules.mjs";

// A pseudo-element ends a selector: ".x:after:where(...)", ".x::before:is(...)", ".x:after.y" are not valid CSS, and the browser drops the
// WHOLE rule (every selector of its list, every declaration) without a warning. The valid order is ".x:where(...):after".
// (Found 2026-11-05 while building the handout-assign pattern B: `CSS.supports("selector(.a:after:where(.b))")` is false, while
// `.a:where(.b):after` is true. Only a user-action pseudo-class such as :hover may follow a pseudo-element, and no rule here uses that.)
// This test reads every stylesheet of css-next/ and checks every selector for a pseudo-element followed by :where() / :is() / :not() /
// :has(), a class, an id or an attribute. Vendor-prefixed pseudo-elements (::-webkit-..., ::-moz-...) are not this error and are left alone.
const root = path.resolve(import.meta.dirname, "..");
const PSEUDO_ELEMENT = "(?:before|after|first-line|first-letter|marker|placeholder|selection|backdrop|file-selector-button)";
const BAD = new RegExp(`::?${PSEUDO_ELEMENT}(?:\\s*:(?:where|is|not|has)\\(|[.#\\[])`);

function stylesheets(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) files.push(...stylesheets(full));
    else if (name.endsWith(".css")) files.push(full);
  }
  return files.sort();
}

// The rules that are still written in the invalid order, until they are fixed (each is a rule that does NOT apply today). Empty: the two
// rules of the trailer pattern B caret were fixed on 2026-11-05. The test fails when a rule listed here is fixed (remove it from the list) and
// when a new one appears (fix it, do not add it here).
const KNOWN_INVALID = [];

function findings() {
  const found = [];
  for (const file of stylesheets(path.join(root, "css-next"))) {
    const rel = path.relative(root, file).split(path.sep).join("/");
    for (const rule of cssStyleRules(readFileSync(file, "utf8"))) {
      for (const selector of splitSelectorList(rule.selector)) {
        if (BAD.test(selector)) found.push({ file: rel, line: rule.line, selector });
      }
    }
  }
  return found;
}

test("the checker finds the invalid order and leaves the valid one and vendor pseudo-elements alone", () => {
  for (const bad of [".a:after:where(.b)", ".a::before:is(.b)", ".a:after:not(.b)", ".a::after.b", ".a:before[x]", ".a:after#i", ".a::marker:has(b)"]) assert.match(bad, BAD, bad);
  for (const good of [".a:where(.b):after", ".a::before", ".a:hover::after", ".a:after", ".a::-webkit-slider-thumb", ".a:focus-visible::-moz-range-thumb", ".a::-webkit-details-marker", ".a:where(.b)::marker"]) assert.doesNotMatch(good, BAD, good);
});

test("no stylesheet of css-next/ has a pseudo-element followed by :where() / :is() / :not() / :has(), a class, an id or an attribute (except the known ones below)", () => {
  const found = findings();
  const unexpected = found.filter(item => !KNOWN_INVALID.some(known => item.file === known.file && item.selector.startsWith(known.selectorStart)));
  assert.deepEqual(unexpected, [], `invalid selector order (the browser drops the whole rule): ${unexpected.map(item => `${item.file}:${item.line}`).join(", ")}`);
});

test("the known invalid rules are still there: when one is fixed it has to leave the list", () => {
  const found = findings();
  for (const known of KNOWN_INVALID) {
    const hits = found.filter(item => item.file === known.file && item.selector.startsWith(known.selectorStart));
    assert.equal(hits.length, known.count, `${known.file}: ${hits.length} of ${known.count} known rules found (fixed? remove it from KNOWN_INVALID)`);
  }
});
