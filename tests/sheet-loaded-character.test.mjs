import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const storeUrl = new URL("../js/sheet-loaded-character.js", import.meta.url);
const fresh = () => import(`${storeUrl.href}?t=${Math.random()}`);

test("late consumers still receive the bundle published before they asked", async () => {
  const store = await fresh();
  const bundle = Object.freeze({ character: { id: "c1" }, skills: [{ id: "s1" }], outfits: [] });
  store.publishSheetCharacterLoaded(bundle);
  assert.equal(await store.whenSheetCharacterLoaded(), bundle);
  const seen = [];
  store.subscribeSheetCharacterLoaded(value => seen.push(value));
  assert.deepEqual(seen, [bundle]);
});

test("consumers waiting before the publish resolve with it", async () => {
  const store = await fresh();
  const waiting = store.whenSheetCharacterLoaded();
  const bundle = { character: { id: "c2" }, skills: [], outfits: [] };
  store.publishSheetCharacterLoaded(bundle);
  assert.equal(await waiting, bundle);
});

test("a failed initial load resolves waiting consumers with null and never overrides a published bundle", async () => {
  const failed = await fresh();
  const waiting = failed.whenSheetCharacterLoaded();
  failed.publishSheetCharacterLoadFailed();
  assert.equal(await waiting, null);

  const loaded = await fresh();
  const bundle = { character: { id: "c3" }, skills: [], outfits: [] };
  loaded.publishSheetCharacterLoaded(bundle);
  loaded.publishSheetCharacterLoadFailed();
  assert.equal(await loaded.whenSheetCharacterLoaded(), bundle);
});

test("only the page's own initial load publishes; comparison reads and DB service stay silent", async () => {
  const read = name => readFile(new URL(`../js/${name}`, import.meta.url), "utf8");
  const [sheet, compare, persistence] = await Promise.all([read("sheet.js"), read("sheet-character-sheet-compare.js"), read("sheet-load-persistence.js")]);
  assert.match(sheet, /publishSheetCharacterLoaded\(bundle\)/);
  assert.doesNotMatch(compare, /sheet-loaded-character/);
  assert.doesNotMatch(persistence, /dispatchEvent|sheet-loaded-character/);
});

test("startup modules take the cast from the shared hand-off instead of querying characters", async () => {
  const read = name => readFile(new URL(`../js/${name}`, import.meta.url), "utf8");
  for (const name of ["sheet-combos.js", "sheet-snapshots.js", "experience.js"]) {
    const source = await read(name);
    assert.match(source, /whenSheetCharacterLoaded\(\)/, name);
    assert.doesNotMatch(source, /from\(\s*"characters"\s*\)/, name);
  }
  const image = await read("sheet-image.js");
  assert.match(image, /whenSheetCharacterLoaded\(\)/);
  assert.match(image, /if\(publicId\)await adoptInitialCharacter\(\)/);
});
