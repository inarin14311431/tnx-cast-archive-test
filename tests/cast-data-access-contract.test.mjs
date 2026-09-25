import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("cast troop link reuses the shared character read", () => {
  const store = read("js/cast-data-store.js");
  const troopLink = read("js/cast-troops-link.js");

  assert.match(store, /export async function getCharacter\(\)/);
  assert.match(store, /\.from\(["']characters["']\)/);
  assert.match(troopLink, /from ["']\.\/cast-data-store\.js["']/);
  assert.match(troopLink, /getCharacter\(\)/);
  assert.doesNotMatch(troopLink, /\.from\(["']characters["']\)/);
  assert.doesNotMatch(troopLink, /characterResult/);
});

test("cast troop link keeps troop data as its own read", () => {
  const troopLink = read("js/cast-troops-link.js");

  assert.match(troopLink, /\.from\(["']troops["']\)/);
  assert.match(troopLink, /\.eq\(["']character_id["'], character\.id\)/);
});
