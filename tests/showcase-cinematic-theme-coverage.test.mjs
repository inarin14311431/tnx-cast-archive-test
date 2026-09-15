import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entry = await readFile(new URL("../css-next/pages/act-showcase-entry.css", import.meta.url), "utf8");
const cinematicTheme = await readFile(new URL("../css-next/pages/act-showcase-cinematic-theme.css", import.meta.url), "utf8");
const showcaseHtml = await readFile(new URL("../act-showcase.html", import.meta.url), "utf8");

const nonNovaScope = ':root[data-showcase-theme]:not([data-showcase-theme="nova"])';

test("cinematic theme layer loads after the general showcase theme coverage", () => {
  assert.match(entry, /act-showcase-cinematic-theme\.css(?:\?[^\"]+)?/);
  assert.ok(
    entry.indexOf("act-showcase-cinematic-theme.css") > entry.indexOf("act-showcase-theme-coverage.css"),
    "cinematic theme bridge must load last so it can own intermediate presentation colors",
  );
  assert.match(showcaseHtml, /act-showcase-entry\.css\?v=11/);
});

test("non-Nova cinematic sequence is driven by showcase theme tokens", () => {
  assert.ok(cinematicTheme.includes(nonNovaScope));
  assert.match(cinematicTheme, /\.neotokyo-sequence__shell/);
  assert.match(cinematicTheme, /\.neotokyo-sequence__screen--opening\.is-cinematic-access/);
  assert.match(cinematicTheme, /\.neotokyo-sequence__screen--title/);
  assert.match(cinematicTheme, /\.neotokyo-sequence__trailer-terminal/);
  assert.match(cinematicTheme, /\.neotokyo-sequence__readout\.is-terminal-readout/);
  assert.match(cinematicTheme, /\.neotokyo-sequence__handout-panel/);
  assert.match(cinematicTheme, /\.neotokyo-sequence__assign-panel/);
  assert.match(cinematicTheme, /\.neotokyo-sequence__cast--linked/);
  assert.match(cinematicTheme, /var\(--showcase-bg\)/);
  assert.match(cinematicTheme, /var\(--showcase-surface-rgb\)/);
  assert.match(cinematicTheme, /var\(--showcase-primary(?:-rgb)?\)/);
  assert.match(cinematicTheme, /var\(--showcase-secondary(?:-rgb)?\)/);
  assert.match(cinematicTheme, /var\(--showcase-tertiary(?:-rgb)?\)/);
  assert.match(cinematicTheme, /var\(--showcase-text\)/);
  assert.match(cinematicTheme, /var\(--showcase-muted\)/);
});

test("handout and assignment transition states receive themed feedback", () => {
  assert.match(cinematicTheme, /\.neotokyo-sequence__screen--linked\.is-read[\s\S]*var\(--showcase-tertiary/);
  assert.match(cinematicTheme, /\.neotokyo-sequence__screen--linked\.is-splitting[\s\S]*var\(--showcase-primary/);
  assert.match(cinematicTheme, /\.neotokyo-sequence__screen--linked\.is-found[\s\S]*var\(--showcase-tertiary/);
  assert.match(cinematicTheme, /\.neotokyo-sequence__screen--linked\.is-assigned[\s\S]*var\(--showcase-tertiary/);
});

test("Nova remains outside the intermediate cinematic override scope", () => {
  assert.doesNotMatch(cinematicTheme, /:root\[data-showcase-theme="nova"\]\s/);
  const scopedRules = cinematicTheme.match(/:root\[data-showcase-theme[^\{]+/g) ?? [];
  assert.ok(scopedRules.length > 20, "expected explicit theme-scoped cinematic rules");
  for (const selector of scopedRules) {
    if (selector.includes('data-showcase-theme="intron"')) continue;
    assert.match(selector, /:not\(\[data-showcase-theme="nova"\]\)/);
  }
});

test("Intron removes glow from long-form cinematic text", () => {
  assert.match(cinematicTheme, /:root\[data-showcase-theme="intron"\][\s\S]*\.neotokyo-sequence__readout\.is-terminal-readout[\s\S]*text-shadow:\s*none/);
});
