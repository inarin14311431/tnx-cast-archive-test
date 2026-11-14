import assert from "node:assert/strict";
import test from "node:test";
import { PANELS, createCastRowHtml, nextPanel, rowPanelId } from "../js/showcase-cast-row.js";

// The panels of a generator cast row (docs/SHOWCASE_GENERATOR_REDESIGN.md): a manual cast has "identity" (編集 EDIT) and "handout"
// (ハンドアウト HANDOUT), a registered cast "handout" only; item.panel is the open one or null. The behaviour in the page is in
// tests/e2e/showcase-generator-cast-panels.spec.js.
const manualItem = (extra = {}) => ({
  source: "manual", manual: true, quote: "", tagline: "", description: "", castNo: "", panel: null,
  character: { id: "manual-1", character_name: "手動", handle: "", player_name: "", manual_styles: "", image_url: "" },
  ...extra
});
const registeredItem = (extra = {}) => ({
  source: "public", manual: false, quote: "", tagline: "", description: "", castNo: "", panel: null,
  character: { id: "c-1", character_name: "登録済み", handle: "", player_name: "", image_url: "" },
  ...extra
});
const html = (item, index = 0) => createCastRowHtml({ item, index, total: 3 });
const attr = (source, name) => [...source.matchAll(new RegExp(`${name}="([^"]*)"`, "g"))].map(match => match[1]);

test("the panel names, and the next panel after a button is pressed: the other one replaces it, the same one closes it", () => {
  assert.deepEqual([...PANELS], ["handout", "identity"]);
  assert.equal(nextPanel(null, "handout", true), "handout");
  assert.equal(nextPanel(null, "identity", true), "identity");
  assert.equal(nextPanel("handout", "identity", true), "identity");
  assert.equal(nextPanel("identity", "handout", true), "handout");
  assert.equal(nextPanel("handout", "handout", true), null);
  assert.equal(nextPanel("identity", "identity", true), null);
  // a registered cast has no identity panel; an unknown name changes nothing
  assert.equal(nextPanel(null, "identity", false), null);
  assert.equal(nextPanel("handout", "identity", false), "handout");
  assert.equal(nextPanel("handout", "nothing", true), "handout");
  assert.equal(nextPanel(undefined, "nothing", true), null);
});

test("panel ids belong to the row and the panel", () => {
  assert.equal(rowPanelId(2), "cast-panel-2-handout");
  assert.equal(rowPanelId(2, "identity"), "cast-panel-2-identity");
});

test("a manual row has EDIT before HANDOUT, two panels, and each button controls its own panel", () => {
  const row = html(manualItem(), 1);
  const buttons = [...row.matchAll(/<button type="button" class="cast-row__toggle[^"]*" data-action="toggle" data-panel="(\w+)" aria-expanded="(\w+)" aria-controls="([^"]+)">([^<]*)<small>(\w+)<\/small>/g)];
  assert.deepEqual(buttons.map(match => [match[1], match[3], match[4].trim(), match[5]]), [
    ["identity", "cast-panel-1-identity", "編集", "EDIT"],
    ["handout", "cast-panel-1-handout", "ハンドアウト", "HANDOUT"]
  ]);
  assert.deepEqual([...row.matchAll(/<div id="([^"]+)" class="cast-row__panel cast-row__panel--(\w+)" data-panel="(\w+)"/g)].map(match => [match[1], match[2], match[3]]), [
    ["cast-panel-1-identity", "identity", "identity"],
    ["cast-panel-1-handout", "handout", "handout"]
  ]);
  // the identity fields are in the identity panel only, the handout fields in the handout panel only
  const [identity, handout] = row.split('id="cast-panel-1-handout"').map((part, at) => at === 0 ? part.slice(part.indexOf('id="cast-panel-1-identity"')) : part);
  for (const field of ["manual-image-url", "manual-handle", "manual-name", "manual-styles", "manual-player", "manual-affiliation"]) {
    assert.ok(identity.includes(`data-field="${field}"`), `${field} in identity`);
    assert.ok(!handout.includes(`data-field="${field}"`), `${field} not in handout`);
  }
  for (const field of ["cast-no", "quote", "tagline", "description"]) {
    assert.ok(handout.includes(`data-field="${field}"`), `${field} in handout`);
    assert.ok(!identity.includes(`data-field="${field}"`), `${field} not in identity`);
  }
});

test("a registered row has HANDOUT only and no identity panel", () => {
  const row = html(registeredItem());
  assert.equal([...row.matchAll(/data-action="toggle"/g)].length, 1);
  assert.match(row, /data-action="toggle" data-panel="handout" aria-expanded="false" aria-controls="cast-panel-0-handout"/);
  assert.ok(!row.includes("cast-row__panel--identity"));
  assert.ok(!row.includes("manual-name"));
  // even if the model says "identity" for a registered cast, nothing opens
  const odd = html(registeredItem({ panel: "identity" }));
  assert.ok(!odd.includes(" is-open"));
  assert.equal([...odd.matchAll(/class="cast-row__panel cast-row__panel--\w+" data-panel="\w+" hidden>/g)].length, 1);
});

test("the open panel is the one item.panel names: aria-expanded, hidden and is-open agree; no panel is open for null", () => {
  const none = html(manualItem());
  assert.ok(!none.includes(" is-open"));
  assert.deepEqual(attr(none, "aria-expanded"), ["false", "false"]);
  assert.equal([...none.matchAll(/class="cast-row__panel cast-row__panel--\w+" data-panel="\w+" hidden>/g)].length, 2);

  for (const panel of ["identity", "handout"]) {
    const row = html(manualItem({ panel }));
    assert.match(row, /class="selected-cast cast-row[^"]* is-open"/);
    const expanded = [...row.matchAll(/data-panel="(\w+)" aria-expanded="(\w+)"/g)].map(match => [match[1], match[2]]);
    assert.deepEqual(expanded, [["identity", String(panel === "identity")], ["handout", String(panel === "handout")]]);
    const hidden = [...row.matchAll(/class="cast-row__panel cast-row__panel--(\w+)" data-panel="\w+"( hidden)?>/g)].map(match => [match[1], Boolean(match[2])]);
    assert.deepEqual(hidden, [["identity", panel !== "identity"], ["handout", panel !== "handout"]]);
  }
  // the old model field is not read any more
  assert.ok(!html(manualItem({ open: true })).includes(" is-open"));
});

test("each panel ends with CLOSE (閉じる + small CLOSE), and the row's heading line can take the focus", () => {
  const row = html(manualItem());
  const closes = [...row.matchAll(/<button type="button" class="cast-row__close" data-action="close" data-panel="(\w+)">閉じる <small>CLOSE<\/small><\/button>/g)].map(match => match[1]);
  assert.deepEqual(closes, ["identity", "handout"]);
  assert.equal([...html(registeredItem()).matchAll(/data-action="close"/g)].length, 1);
  assert.match(row, /<div class="cast-row__main" tabindex="-1">/);
  // a close button is the last thing of its panel: its foot is inside the panel, after the fields
  const identityPanel = row.slice(row.indexOf('id="cast-panel-0-identity"'), row.indexOf('id="cast-panel-0-handout"'));
  assert.ok(identityPanel.lastIndexOf("cast-row__panel-foot") > identityPanel.lastIndexOf('data-field="manual-'));
  const handoutPanel = row.slice(row.indexOf('id="cast-panel-0-handout"'));
  assert.ok(handoutPanel.lastIndexOf("cast-row__panel-foot") > handoutPanel.lastIndexOf('data-field="description"'));
});
