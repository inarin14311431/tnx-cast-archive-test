import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../act-showcase.html", import.meta.url), "utf8");
const polish = readFileSync(new URL("../js/act-showcase-cinematic-polish.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../css-next/pages/act-showcase-cinematic-readability.css", import.meta.url), "utf8");

test("cinematic polish loads after finale decoration and before the showcase module", () => {
  assert.match(html, /act-showcase-cinematic-readability\.css\?v=20260908a/);
  assert.match(html, /act-showcase-cinematic-polish\.js\?v=20260908a/);
  assert.ok(html.indexOf("act-showcase-finale.css") < html.indexOf("act-showcase-cinematic-readability.css"));
  assert.ok(html.indexOf("act-showcase-cinematic-polish.js") < html.indexOf("act-showcase-page.js"));
});

test("title screen pauses on the canonical 1900ms title wait until explicit input", () => {
  assert.match(polish, /Number\(delay\) !== 1900/);
  assert.match(polish, /pauseArmed/);
  assert.match(polish, /ACCESS TRAILER/);
  assert.match(polish, /is-awaiting-title-access/);
  assert.match(polish, /stage\?\.addEventListener\("click", onStageClick\)/);
  assert.match(polish, /60 \* 60 \* 1000/);
});

test("act titles and cast names use length-aware single-line fitting on desktop", () => {
  assert.match(polish, /showcase-fit-title/);
  assert.match(polish, /showcase-fit-cast-name/);
  assert.match(polish, /poster-v2-name/);
  assert.match(polish, /neotokyo-sequence__cast-detail h3/);
  assert.match(css, /#opening-act-name\.showcase-fit-title/);
  assert.match(css, /poster-v2-name\.showcase-fit-cast-name/);
  assert.match(css, /white-space:nowrap/);
  assert.match(css, /data-name-fit="xlong"/);
});

test("final ACT READY screen exposes a prominent ACCESS ACT control", () => {
  assert.match(polish, /neotokyo-finale__access-button/);
  assert.match(polish, /ACCESS ACT/);
  assert.match(polish, /OPEN FULL SHOWCASE/);
  assert.match(polish, /neotokyo-sequence__advance/);
  assert.match(css, /neotokyo-finale__access-button/);
  assert.match(css, /neotokyo-access-scan/);
});

test("new decoration keeps reduced-motion support and CSS architecture rules", () => {
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css, /!important/);
});
