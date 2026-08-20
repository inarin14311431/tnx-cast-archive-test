import test from "node:test";
import assert from "node:assert/strict";
import {
  moveRowWithinCategory,
  normalizeOutfitCategory,
  removeRowByKey
} from "../js/sheet-row-collection-state.js";

test("removeRowByKey removes only the requested editor row without mutating the source", () => {
  const source = [{ _key: "a" }, { _key: "b" }, { _key: "c" }];
  const result = removeRowByKey(source, "b");
  assert.deepEqual(result.map(item => item._key), ["a", "c"]);
  assert.deepEqual(source.map(item => item._key), ["a", "b", "c"]);
});

test("moveRowWithinCategory skips rows from other categories and preserves them", () => {
  const source = [
    { _key: "g1", category: "general" },
    { _key: "s1", category: "social" },
    { _key: "g2", category: "general" },
    { _key: "c1", category: "connection" }
  ];
  const result = moveRowWithinCategory(source, "g2", "up");
  assert.equal(result.moved, true);
  assert.deepEqual(result.rows.map(item => item._key), ["g2", "s1", "g1", "c1"]);
  assert.deepEqual(source.map(item => item._key), ["g1", "s1", "g2", "c1"]);
});

test("moveRowWithinCategory is a no-op at category boundaries", () => {
  const source = [{ _key: "g1", category: "general" }, { _key: "s1", category: "social" }];
  const result = moveRowWithinCategory(source, "g1", "up");
  assert.equal(result.moved, false);
  assert.deepEqual(result.rows, source);
});

test("normalizeOutfitCategory accepts canonical categories and falls back to other", () => {
  const categories = new Set(["weapon", "armor", "other"]);
  assert.equal(normalizeOutfitCategory("weapon", categories), "weapon");
  assert.equal(normalizeOutfitCategory("unknown", categories), "other");
  assert.equal(normalizeOutfitCategory("", categories), "other");
});
