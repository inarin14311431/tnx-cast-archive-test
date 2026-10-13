import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// Description cells in the public view (style skills and every outfit table, desktop cell and tablet row)
// show two lines with an ellipsis; 全表示 / a click expands them. The editor is not touched.
test("view description cells are divs with the text in a clamped inner span", async () => {
  const styleSkills = await read("js/cast-style-skills.js");
  const outfits = await read("js/cast-outfits.js");

  assert.doesNotMatch(styleSkills, /<textarea/);
  assert.doesNotMatch(outfits, /<textarea/);
  assert.match(styleSkills, /<div class="style-field-scroll style-description-expandable" role="button" tabindex="0" aria-expanded="false"[^>]*><span class="style-description-text">/);
  // desktop cell + tablet row
  assert.equal(outfits.match(/<div class="style-field-scroll style-description-expandable outfit-description-expandable" role="button" tabindex="0" aria-expanded="false"[^>]*><span class="style-description-text">/g)?.length, 2);
});

test("two-line clamp is one shared rule for both tables, and expanding lifts it", async () => {
  const css = await read("css-next/pages/cast.css");
  const clamp = css.match(/\.style-description-expandable > \.style-description-text \{([^}]*)\}/)[1];
  assert.match(clamp, /display:\s*-webkit-box/);
  assert.match(clamp, /-webkit-line-clamp:\s*2/);
  assert.match(clamp, /overflow:\s*hidden/);

  const box = css.match(/\.style-skill-view-table \.style-description-expandable, \.cast-outfit-table \.style-description-expandable \{([^}]*)\}/)[1];
  assert.match(box, /height:\s*auto/);
  assert.match(box, /min-height:\s*35px/); // a one-line description keeps the previous row height
  assert.doesNotMatch(box, /-webkit-line-clamp/); // padding must not sit on the clamped box or a third line shows

  assert.match(css, /\.style-description-expandable\.is-expanded > \.style-description-text \{[^}]*-webkit-line-clamp:\s*unset/);
});

test("expanding only toggles classes; no measured heights are left in the view controls", async () => {
  const controls = await read("js/cast-view-controls.js");
  const tableControls = await read("js/cast-style-skill-table-controls.js");
  assert.doesNotMatch(controls, /description[\s\S]{0,400}style\.setProperty\("height"/);
  assert.doesNotMatch(tableControls, /refreshExpandedDescriptions/);
  assert.doesNotMatch(controls, /isScrollbarInteraction/);
});

test("the editor description textarea is unchanged", async () => {
  const renderer = await read("js/sheet-skill-renderer.js");
  assert.match(renderer, /<textarea data-f="description" data-style-field="description" rows="2">/);
});

// An expanded row used to give every cell vertical-align: top (the name cell only stayed centered because
// cast-view-details.css sets its own middle). Expanded rows keep the table's default middle alignment.
test("expanded description rows keep every cell vertically centered", async () => {
  const css = await read("css-next/pages/cast.css");
  const widths = await read("css-next/pages/cast-outfit-column-widths.css");
  for (const source of [css, widths]) {
    const rules = source.match(/[^\n{}]*is-description-expanded[^{}]*\{[^}]*\}/g) ?? [];
    assert.ok(rules.length > 0);
    for (const rule of rules) assert.doesNotMatch(rule, /vertical-align:\s*top/, rule);
  }
  assert.match(css, /\.data-table :where\(th, td\), \.cast-outfit-table :where\(th, td\) \{[^}]*vertical-align:\s*middle/);
});
