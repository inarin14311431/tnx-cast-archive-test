import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const cardSource = await read("js/cast-sns-card.js");
const formatterSource = await read("js/archive-id-code.js");

const formatter = (() => {
  const context = { window: {} };
  vm.runInNewContext(formatterSource, context);
  return context.window.TNXArchiveId;
})();

// resolveArchiveId is module-private, so run its source with stand-ins for the two things it reads.
function resolveWith({ param = "", format = formatter.format } = {}) {
  const start = cardSource.indexOf("function resolveArchiveId(");
  const end = cardSource.indexOf("\nfunction loadImage(");
  assert.ok(start > 0 && end > start);
  const body = cardSource.slice(start, end);
  const context = { getPublicIdParam: () => param, globalThis: { TNXArchiveId: format ? { format } : undefined } };
  return vm.runInNewContext(`${body}; resolveArchiveId`, context);
}

test("the card prints the ARCHIVE ID the cast header shows", () => {
  assert.equal(resolveWith({ param: "TNX-000064" })({ public_id: "TNX-000064" }), "TNX-R935-SQTY");
  assert.equal(formatter.format("TNX-000064"), "TNX-R935-SQTY");
});

test("the card uses the same value source and formatter as the header", () => {
  const header = cardSource.includes("getPublicIdParam") && cardSource.includes("TNXArchiveId");
  assert.ok(header);
  assertVersionedMatch(cardSource, /import \{ getPublicIdParam \} from "\.\/public-id-param\.js\?v=VERSION"/);
  assert.match(cardSource, /\$\{esc\(resolveArchiveId\(cast\)\)\}/);
  assert.doesNotMatch(cardSource, /esc\(cast\.public_id/);
});

test("fallbacks: cast row when the URL has no id, plain serial without the formatter, NO ID without an id", () => {
  assert.equal(resolveWith({ param: "" })({ public_id: "TNX-000064" }), "TNX-R935-SQTY");
  assert.equal(resolveWith({ param: "TNX-000064", format: null })({ public_id: "TNX-000064" }), "TNX-000064");
  assert.equal(resolveWith({ param: "" })({ public_id: "" }), "NO ID");
  assert.equal(resolveWith({ param: "" })({}), "NO ID");
  // never the formatter's placeholder for an empty id
  assert.notEqual(resolveWith({ param: "" })({ public_id: "  " }), "TNX-VOID-VOID");
});

test("the preview and the downloaded PNG both come from the one SVG builder", () => {
  assert.equal(cardSource.match(/createCardSvg\(character,/g).length, 2); // renderPreview + downloadCard
  assert.equal(cardSource.match(/function createCardSvg\(/g).length, 1);
});
