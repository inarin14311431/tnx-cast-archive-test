import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// css-next/pages/sheet-mobile-image.css: the stored zoom (--tnx-image-scale, 100-200%) is a transform on the <img>, and a transform is not clipped by the
// img's own overflow. So the element that holds the image must clip it, in the editor's section button as well as in the dialog's preview;
// otherwise the enlarged picture spills over the caption, the text below and the page width (docs: the 09 キャスト画像 section).
const css = (await readFile(new URL("../css-next/pages/sheet-mobile-image.css", import.meta.url), "utf8")).replace(/\/\*[\s\S]*?\*\//g, "");
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({ selector: match[1].trim(), body: match[2] }));
const PREFIX = 'body[data-page="sheet-mobile.html"] ';

test("every image that is enlarged with the stored zoom sits in a box that clips it", () => {
  const scaled = rules.filter(rule => /transform:scale\(var\(--tnx-image-scale/.test(rule.body) && / img$/.test(rule.selector));
  assert.ok(scaled.length >= 2, "the section button and the dialog preview are both enlarged");
  for (const rule of scaled) {
    const holder = rule.selector.replace(/ img$/, "");
    const clipping = rules.filter(other => other.selector === holder && /(?:^|;)overflow:hidden(?:;|$)/.test(other.body));
    assert.equal(clipping.length, 1, `${holder} clips its enlarged image`);
  }
});

test("the caption under the section image stays above the enlarged picture", () => {
  const caption = rules.find(rule => rule.selector === `${PREFIX}.mobile-image-display span`);
  assert.ok(caption, "the caption rule exists");
  assert.match(caption.body, /position:relative/);
  assert.match(caption.body, /z-index:1/);
  assert.match(caption.body, /background:var\(--color-surface\)/);
});

test("the section image rule is written once (audit:css keeps duplicate selectors out)", () => {
  const holders = rules.filter(rule => rule.selector === `${PREFIX}.mobile-image-display`);
  assert.equal(holders.length, 1);
});
