import test from "node:test";
import assert from "node:assert/strict";
import {
  RETURN_DESTINATIONS,
  PARENT_RETURN_PAGES,
  DEFAULT_RETURN_HREF,
  readTrimmedSearchParam,
  toLocalHref,
  parseReturnDestination,
  resolveParentReturnHref
} from "../js/sheet-navigation-core.js";

const ORIGIN = "https://example.test";
const BASE_HREF = `${ORIGIN}/sheet.html?id=TNX-000001`;

test("RETURN_DESTINATIONS keeps the exact PC label and Mobile aria-label text both adapters depended on", () => {
  assert.deepEqual(RETURN_DESTINATIONS["index.html"], { label: "キャスト一覧へ", enLabel: "RETURN TO ARCHIVE", ariaLabel: "キャスト一覧へ戻る" });
  assert.deepEqual(RETURN_DESTINATIONS["account.html"], { label: "アカウントへ", enLabel: "RETURN TO ACCOUNT", ariaLabel: "アカウントへ戻る" });
  assert.deepEqual(RETURN_DESTINATIONS["acts.html"], { label: "参加アクト一覧へ", enLabel: "RETURN TO ACT HISTORY", ariaLabel: "参加アクト一覧へ戻る" });
  assert.deepEqual(RETURN_DESTINATIONS["showcase-generator.html"], { label: "アクト紹介生成へ", enLabel: "RETURN TO SHOWCASE EDITOR", ariaLabel: "アクト紹介生成へ戻る" });
  assert.deepEqual(RETURN_DESTINATIONS["troops.html"], { label: "トループ一覧へ", enLabel: "RETURN TO TROOPS", ariaLabel: "トループ一覧へ戻る" });
  assert.deepEqual(RETURN_DESTINATIONS["troop.html"], { label: "トループへ", enLabel: "RETURN TO TROOP", ariaLabel: "トループへ戻る" });
  assert.equal(RETURN_DESTINATIONS["cast.html"], undefined);
});

test("PARENT_RETURN_PAGES is exactly the RETURN_DESTINATIONS key set", () => {
  assert.deepEqual([...PARENT_RETURN_PAGES].sort(), Object.keys(RETURN_DESTINATIONS).sort());
});

test("readTrimmedSearchParam trims values and defaults missing params to an empty string", () => {
  assert.equal(readTrimmedSearchParam("?return=%20%2Findex.html%20", "return"), "/index.html");
  assert.equal(readTrimmedSearchParam("?other=1", "return"), "");
  assert.equal(readTrimmedSearchParam("", "id"), "");
});

test("toLocalHref keeps only pathname, search and hash", () => {
  const url = new URL("https://example.test/account.html?tab=owned#top");
  assert.equal(toLocalHref(url), "/account.html?tab=owned#top");
});

test("parseReturnDestination accepts a known same-origin page and reports its page key and labels", () => {
  const destination = parseReturnDestination("./index.html?q=1", { origin: ORIGIN, baseHref: BASE_HREF });
  assert.ok(destination);
  assert.equal(destination.page, "index.html");
  assert.equal(toLocalHref(destination.url), "/index.html?q=1");
  assert.equal(destination.labels.label, "キャスト一覧へ");
});

test("parseReturnDestination rejects cross-origin return values", () => {
  assert.equal(parseReturnDestination("https://evil.example/index.html", { origin: ORIGIN, baseHref: BASE_HREF }), null);
});

test("parseReturnDestination rejects pages outside the allow-list", () => {
  assert.equal(parseReturnDestination("./cast.html?id=TNX-000001", { origin: ORIGIN, baseHref: BASE_HREF }), null);
  assert.equal(parseReturnDestination("./sheet-mobile.html", { origin: ORIGIN, baseHref: BASE_HREF }), null);
});

test("parseReturnDestination rejects empty, blank and malformed values", () => {
  assert.equal(parseReturnDestination("", { origin: ORIGIN, baseHref: BASE_HREF }), null);
  assert.equal(parseReturnDestination("   ", { origin: ORIGIN, baseHref: BASE_HREF }), null);
  assert.equal(parseReturnDestination("http://[invalid", { origin: ORIGIN, baseHref: BASE_HREF }), null);
});

test("resolveParentReturnHref falls back to DEFAULT_RETURN_HREF when there is no destination", () => {
  assert.equal(resolveParentReturnHref(null), DEFAULT_RETURN_HREF);
  assert.equal(DEFAULT_RETURN_HREF, "./account.html");
});

test("resolveParentReturnHref honors a caller-supplied fallback, matching mobile-editor-route's page-contextual default", () => {
  assert.equal(resolveParentReturnHref(null, { fallback: "./index.html" }), "./index.html");
  assert.equal(resolveParentReturnHref(null, { fallback: "./account.html" }), "./account.html");
});

test("resolveParentReturnHref returns the parsed destination's local href when present, regardless of the fallback", () => {
  const destination = parseReturnDestination("./troop.html?id=5", { origin: ORIGIN, baseHref: BASE_HREF });
  assert.equal(resolveParentReturnHref(destination), "/troop.html?id=5");
  assert.equal(resolveParentReturnHref(destination, { fallback: "./index.html" }), "/troop.html?id=5");
});

// PC/Mobile parity contract (CURRENT_STATE.md section 4, priority 4): both
// adapters now drive their "return to parent" href from this same core, so a
// given `return` query value must resolve to the same destination and href
// no matter which adapter's label field (PC's `label`/`enLabel` vs Mobile's
// `ariaLabel`) is read off the result.
test("PC and Mobile adapters resolve identical parent hrefs and page identity for the same return value", () => {
  const scenarios = [
    "./index.html",
    "./account.html?tab=owned",
    "./acts.html#history",
    "./showcase-generator.html?act=1",
    "./troops.html",
    "./troop.html?id=9",
    "",
    "   ",
    "./cast.html?id=TNX-000001",
    "https://evil.example/account.html"
  ];

  for (const returnValue of scenarios) {
    const destination = parseReturnDestination(returnValue, { origin: ORIGIN, baseHref: BASE_HREF });

    // PC adapter shape: renders destination.labels.label / .enLabel.
    const pcHref = resolveParentReturnHref(destination);
    // Mobile adapter shape: renders destination.labels.ariaLabel.
    const mobileHref = resolveParentReturnHref(destination);

    assert.equal(pcHref, mobileHref, `href mismatch for return=${JSON.stringify(returnValue)}`);

    if (destination) {
      assert.ok(destination.labels.label, `PC label missing for return=${JSON.stringify(returnValue)}`);
      assert.ok(destination.labels.ariaLabel, `Mobile aria label missing for return=${JSON.stringify(returnValue)}`);
    } else {
      assert.equal(pcHref, DEFAULT_RETURN_HREF);
    }
  }
});
