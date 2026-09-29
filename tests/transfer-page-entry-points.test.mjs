import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const account = await readFile(new URL("../js/account.js", import.meta.url), "utf8");
const cast = await readFile(new URL("../cast.html", import.meta.url), "utf8");
const transfer = await readFile(new URL("../transfer.html", import.meta.url), "utf8");
const transferLink = await readFile(new URL("../js/cast-transfer-link.js", import.meta.url), "utf8");

test("account cast card links to the transfer page with the internal id", () => {
  assert.match(
    account,
    /<a href="\$\{SITE_BASE_PATH\}transfer\.html\?id=\$\{id\}">\$\{actionLabel\("データ転記", "TRANSFER"\)\}<\/a>/
  );
});

test("cast view exposes a static transfer-page link that a small module fills in with the current id", () => {
  assert.match(cast, /id="cast-transfer-page-link"[^>]*href="\.\/transfer\.html"/);
  assert.match(cast, /cast-transfer-link\.js\?v=1/);
  assert.match(transferLink, /#cast-transfer-page-link/);
  assert.match(transferLink, /`\.\/transfer\.html\?id=\$\{encodeURIComponent\(publicId\)\}`/);
});

test("transfer page loads the display-code formatter and shows the display-code placeholder", () => {
  assert.match(transfer, /<script src="\.\/js\/archive-id-code\.js\?v=1"><\/script>/);
  assert.match(transfer, /placeholder="TNX-XXXX-XXXX（表示コード）または cast\.html\?id=…"/);
});

test("cast-transfer-link.js fills in the internal id from the page's own URL", async () => {
  globalThis.location = { search: "?id=TNX-000117" };
  const link = { href: "", removed: false, remove() { this.removed = true; } };
  globalThis.document = { querySelector: selector => (selector === "#cast-transfer-page-link" ? link : null) };
  await import(`../js/cast-transfer-link.js?test=${Date.now()}`);
  assert.equal(link.href, "./transfer.html?id=TNX-000117");
  assert.equal(link.removed, false);
});

test("cast-transfer-link.js removes the link when the page has no id", async () => {
  globalThis.location = { search: "" };
  const link = { href: "", removed: false, remove() { this.removed = true; } };
  globalThis.document = { querySelector: selector => (selector === "#cast-transfer-page-link" ? link : null) };
  await import(`../js/cast-transfer-link.js?test=${Date.now()}`);
  assert.equal(link.removed, true);
  assert.equal(link.href, "");
});
