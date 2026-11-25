import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import * as fragmentModule from "../js/transfer-fragment.js";

const { buildTransferUrl, decodeTransferFragment } = fragmentModule;
const TSV = "TNX_CAST_TRANSFER_TSV\t1\tsection\tindex\tfield\tvalue\nTNX_CAST_TRANSFER_TSV\t1\tbase\t0\tname\tテスト★キャスト";
const sheetUrl = "https://character-sheets.appspot.com/tnx/edit.html?key=abc_DEF-1";
const hashOf = async (overrides = {}) => new URL(await buildTransferUrl({ sheetUrl, publicId: "TNX-1", tsv: TSV, ...overrides })).hash;
const bookmarklet = await readFile(new URL("../js/tnx-transfer-bookmarklet.js", import.meta.url), "utf8");

test("fragment round-trips the TSV, cast id and sheet key", async () => {
  const url = await buildTransferUrl({ sheetUrl, publicId: "TNX-1", tsv: TSV });
  assert.ok(url.startsWith(`${sheetUrl}#tnxcast=v1.`));
  assert.match(new URL(url).hash, /^#tnxcast=v1\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(await decodeTransferFragment(new URL(url).hash), { mode: "update", key: "abc_DEF-1", publicId: "TNX-1", tsv: TSV });
});

test("a cast without a sheet URL builds a new-sheet link without a key", async () => {
  const url = await buildTransferUrl({ sheetUrl: "", publicId: "TNX-1", tsv: TSV });
  assert.ok(url.startsWith("https://character-sheets.appspot.com/tnx/edit.html#tnxcast=v1."));
  assert.deepEqual(await decodeTransferFragment(new URL(url).hash), { mode: "new", key: "", publicId: "TNX-1", tsv: TSV });
  assert.equal(fragmentModule.transferModeFor(""), "new");
  assert.equal(fragmentModule.transferModeFor(sheetUrl), "update");
  assert.equal(fragmentModule.transferModeFor("https://example.test/x"), null);
});

test("mode and key must agree, and links made before modes existed still decode", async () => {
  const encode = payload => `#tnxcast=v1.${gzipSync(JSON.stringify(payload)).toString("base64url")}`;
  await assert.rejects(decodeTransferFragment(encode({ mode: "new", key: "abc", tsv: TSV })), /壊れて/);
  await assert.rejects(decodeTransferFragment(encode({ mode: "update", key: "", tsv: TSV })), /壊れて/);
  await assert.rejects(decodeTransferFragment(encode({ mode: "other", key: "abc", tsv: TSV })), /壊れて/);
  assert.equal((await decodeTransferFragment(encode({ key: "abc", tsv: TSV }))).mode, "update");
});

test("new-sheet data fills only a page without a key, and update data never fills one", async () => {
  const fresh = await hashOf({ sheetUrl: "" });
  assert.equal((await runBookmarklet({ hash: fresh, key: "" })).filled, true);
  assert.equal((await runBookmarklet({ hash: fresh, key: "abc_DEF-1" })).filled, false);
  assert.equal((await runBookmarklet({ hash: await hashOf(), key: "" })).filled, false);
});

test("building fails for other hosts or without TSV rows", async () => {
  await assert.rejects(hashOf({ sheetUrl: "https://example.test/tnx/edit.html?key=a" }), /倉庫URL/);
  await assert.rejects(hashOf({ tsv: TSV.split("\n")[0] }), /作成できません/);
});

test("decoding rejects unknown versions, damaged payloads and oversized data", async () => {
  const hash = await hashOf();
  await assert.rejects(decodeTransferFragment(hash.replace("v1.", "v2.")), /対応していません/);
  await assert.rejects(decodeTransferFragment("#tnxcast=v1.%%%"), /壊れて/);
  await assert.rejects(decodeTransferFragment(hash.slice(0, -12)), /壊れて/);
  const middle = Math.floor(hash.length / 2);
  await assert.rejects(decodeTransferFragment(hash.slice(0, middle) + (hash[middle] === "A" ? "B" : "A") + hash.slice(middle + 1)), /壊れて/);
  await assert.rejects(hashOf({ tsv: TSV + "あ".repeat(400000) }), /大きすぎ/);
  await assert.rejects(decodeTransferFragment(`#tnxcast=v1.${"A".repeat(200001)}`), /大きすぎ/);
});

async function runBookmarklet({ hash = "", key = "abc_DEF-1", clipboard = "", confirmAnswer = false }) {
  const log = { alerts: [], confirms: [], replaced: [], clipboardReads: 0, filled: false };
  const location = { hostname: "character-sheets.appspot.com", pathname: "/tnx/edit.html", search: key ? `?key=${key}` : "", hash };
  const window = { originData: {} };
  const context = {
    window, location, URL, URLSearchParams, setTimeout, console: { error() {} },
    Element: class {}, Event: class {},
    history: { state: null, replaceState: (_s, _t, url) => { log.replaced.push(url); location.hash = ""; } },
    navigator: { clipboard: { readText: async () => { log.clipboardReads += 1; return clipboard; } } },
    alert: text => log.alerts.push(text),
    confirm: text => { log.confirms.push(text); return confirmAnswer; },
    prompt: () => "",
    document: {
      currentScript: { src: "https://example.test/js/tnx-transfer-bookmarklet.js" },
      createElement: () => ({ style: {}, setAttribute() {}, remove() {} }),
      body: { append() {} },
      documentElement: { append(script) { log.filled = true; script.onerror?.(); } },
      addEventListener() {}, removeEventListener() {}
    },
    __import: async () => fragmentModule
  };
  await vm.runInNewContext(bookmarklet.replace("import(localResource", "__import(localResource"), context);
  return log;
}

test("a matching fragment is consumed, stripped from the URL and sent to the form filler", async () => {
  const log = await runBookmarklet({ hash: await hashOf() });
  assert.deepEqual(log.replaced, ["/tnx/edit.html?key=abc_DEF-1"]);
  assert.equal(log.filled, true);
  assert.equal(log.clipboardReads, 0);
});

test("a fragment for another sheet or a damaged one never fills and never falls back to the clipboard", async () => {
  const hash = await hashOf();
  for (const options of [{ hash, key: "other" }, { hash: hash.slice(0, -12) }, { hash: "#tnxcast=" }]) {
    const log = await runBookmarklet({ clipboard: TSV, confirmAnswer: true, ...options });
    assert.equal(log.filled, false);
    assert.equal(log.clipboardReads, 0);
    assert.equal(log.replaced.length, 1);
    assert.match(log.alerts.join("\n"), /転記ボタンから開き直して/);
  }
});

test("without a fragment the clipboard is used only after confirming the cast name", async () => {
  const declined = await runBookmarklet({ clipboard: TSV });
  assert.match(declined.confirms[0], /テスト★キャスト/);
  assert.equal(declined.filled, false);
  assert.equal((await runBookmarklet({ clipboard: TSV, confirmAnswer: true })).filled, true);
  const empty = await runBookmarklet({ clipboard: "something else" });
  assert.equal(empty.filled, false);
  assert.match(empty.alerts[0], /転記ボタンから開き直して/);
});

test("bookmarklet modules never register the sheet and load nothing from a third-party CDN", async () => {
  for (const name of ["tnx-transfer-base.js", "tnx-transfer-bookmarklet.js", "transfer-fragment.js"]) {
    const source = await readFile(new URL(`../js/${name}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /sendForm|sendButton|\.submit\(|fetch\(|XMLHttpRequest|jsdelivr/);
  }
  assert.match(bookmarklet, /項目を入力しました。保存してください。/);
});
