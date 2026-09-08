import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("act-showcase.html", "utf8");
const script = fs.readFileSync("js/act-showcase-tagline-quotes.js", "utf8");

test("act showcase loads Japanese tagline quote normalizer", () => {
  assert.match(html, /act-showcase-tagline-quotes\.js\?v=2/);
});

test("tagline quote normalizer covers actual cast one-line display locations", () => {
  for (const selector of [
    ".poster-v2-tagline",
    ".neotokyo-sequence__cast-tagline",
    ".neotokyo-sequence__summary-cast-tagline"
  ]) {
    assert.ok(script.includes(selector), `missing selector: ${selector}`);
  }
  assert.ok(
    !script.includes(".poster-v2-visual__caption > span"),
    "CAST VISUAL caption now carries technical metadata and must not be quoted as a tagline"
  );
});

test("tagline quote normalizer converts existing quote styles to Japanese brackets without quoting fallbacks", () => {
  assert.match(script, /\["「", "」"\]/);
  assert.match(script, /\["“", "”"\]/);
  assert.match(script, /return source \? `「\$\{source\}」` : ""/);
  assert.match(script, /PUBLIC CAST ARCHIVE/);
});
