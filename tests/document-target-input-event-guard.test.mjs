import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// document is an EventTarget without Element.prototype.matches. Node's
// built-in EventTarget/Event reproduce that shape exactly: dispatching from
// a bare EventTarget gives listeners an event.target that also lacks
// .matches, without needing a DOM/jsdom. This is the real bug from
// document.dispatchEvent(new Event('input', {bubbles:true})) in
// js/sheet-import.js, which used to crash sheet-sidebar-actions.js:186 with
// "TypeError: event.target.matches is not a function".

test("dispatching an event whose target lacks Element.prototype.matches throws with the unguarded event.target.matches(...) pattern this fix removed", () => {
  const target = new EventTarget();
  let handlerRan = false;
  target.addEventListener("input", event => {
    handlerRan = true;
    assert.throws(() => event.target.matches("#some-input"), TypeError);
  });
  target.dispatchEvent(new Event("input", { bubbles: true }));
  assert.ok(handlerRan);
});

test("the optional-chaining guard (event.target?.matches?.(...)) applied to the 3 affected files does not throw for the same target", () => {
  const target = new EventTarget();
  let handlerRan = false;
  target.addEventListener("input", event => {
    handlerRan = true;
    assert.doesNotThrow(() => event.target?.matches?.("#some-input"));
    assert.equal(event.target?.matches?.("#some-input"), undefined);
  });
  target.dispatchEvent(new Event("input", { bubbles: true }));
  assert.ok(handlerRan);
});

test("sheet-import.js dispatches its post-import notification from document.body, not document, so event.target is a real Element", async () => {
  const source = await read("js/sheet-import.js");
  assert.match(source, /document\.body\.dispatchEvent\(new Event\('input',\{bubbles:true\}\)\);/);
  assert.doesNotMatch(source, /(?<!\.body)document\.dispatchEvent\(new Event\('input'/);
});

test("sheet-sidebar-actions.js guards event.target.matches against non-Element targets", async () => {
  const source = await read("js/sheet-sidebar-actions.js");
  const guarded = "event.target?.matches?.('#reason-base,#reason-mod,#passion-base,#passion-mod,#life-base,#life-mod,#cs-mod')";
  assert.equal((source.match(new RegExp(guarded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 2);
  assert.doesNotMatch(source, /event\.target\.matches\(/);
});

test("help-ui.js guards event.target.matches against non-Element targets", async () => {
  const source = await read("js/help-ui.js");
  assert.match(source, /event\.target\?\.matches\?\.\("\[data-help-close\]"\)/);
  assert.doesNotMatch(source, /event\.target\.matches\(/);
});

test("sheet-mobile-style.js guards event.target.matches against non-Element targets", async () => {
  const source = await read("js/sheet-mobile-style.js");
  assert.match(source, /event\.target\?\.matches\?\.\("\[data-mobile-style-name\], \[data-mobile-style-attribute\]"\)/);
  assert.doesNotMatch(source, /event\.target\.matches\(/);
});
