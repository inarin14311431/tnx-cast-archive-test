import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as config from "../js/image-thumbnail-config.js";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

const read = file => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("thumbnail spec: 840px long edge, 120KB target, 200KB ceiling", () => {
  assert.equal(config.THUMBNAIL_MAX_LONG_EDGE, 840);
  assert.equal(config.THUMBNAIL_TARGET_SIZE, 120 * 1024);
  assert.equal(config.THUMBNAIL_MAX_OUTPUT_FILE_SIZE, 200 * 1024);
  assert.ok(config.THUMBNAIL_TARGET_SIZE < config.THUMBNAIL_MAX_OUTPUT_FILE_SIZE);
});

test("PC and mobile uploaders read the thumbnail spec from the shared config (no duplicated literals)", async () => {
  for (const file of ["js/sheet-image.js", "js/sheet-mobile-image.js"]) {
    const source = await read(file);
    assertVersionedMatch(source, /from "\.\/image-thumbnail-config\.js\?v=VERSION"/, `${file} must import the shared config`);
    assert.doesNotMatch(source, /\b420\b/, `${file} must not hard-code the old 420px edge`);
    assert.doesNotMatch(source, /40\s*\*\s*1024/, `${file} must not hard-code the old 40KB target`);
    assert.doesNotMatch(source, /200\s*\*\s*1024/, `${file} must not hard-code the thumbnail ceiling`);
  }
});
