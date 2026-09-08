import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("act showcase loads the cyberpunk title layer and display font", async () => {
  const html = await read("act-showcase.html");
  assert.match(html, /family=Dela\+Gothic\+One/);
  assert.match(html, /act-showcase-title-cyberpunk\.css\?v=20260908a/);
  assert.match(html, /act-showcase-visual-caption-code\.js\?v=2/);
  assert.match(html, /act-showcase-tagline-quotes\.js\?v=2/);
});

test("cyberpunk title keeps the title as a logo rather than plain gothic text", async () => {
  const css = await read("css-next/pages/act-showcase-title-cyberpunk.css");
  assert.match(css, /Dela Gothic One/);
  assert.match(css, /neotokyo-sequence__act-title--logo\.showcase-fit-title:before/);
  assert.match(css, /neotokyo-sequence__screen--title-logo:after/);
  assert.match(css, /clip-path:polygon/);
});

test("cast visual caption replaces the duplicate tagline with visual metadata", async () => {
  const code = await read("js/act-showcase-visual-caption-code.js");
  const quotes = await read("js/act-showcase-tagline-quotes.js");
  assert.match(code, /ENTRY STYLE \/\//);
  assert.match(code, /AFFILIATION \/\//);
  assert.match(code, /poster-v2-visual__meta/);
  assert.match(code, /CAST VISUAL \/\/ PUBLIC ARCHIVE/);
  assert.doesNotMatch(quotes, /poster-v2-visual__caption > span/);
});
