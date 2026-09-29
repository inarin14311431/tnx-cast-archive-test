import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const account = await readFile(new URL("../js/account.js", import.meta.url), "utf8");
const cast = await readFile(new URL("../cast.html", import.meta.url), "utf8");
const transfer = await readFile(new URL("../transfer.html", import.meta.url), "utf8");
const transferLink = await readFile(new URL("../js/cast-transfer-link.js", import.meta.url), "utf8");
const accountActionsCss = await readFile(new URL("../css-next/pages/account-actions.css", import.meta.url), "utf8");

test("account cast card links to the transfer page with the internal id, from the management row", () => {
  assert.match(
    account,
    /<a class="owned-cast__transfer" href="\$\{SITE_BASE_PATH\}transfer\.html\?id=\$\{id\}">\$\{actionLabel\("データ転記", "TRANSFER"\)\}<\/a>/
  );
  const managementBlock = account.match(/<div class="owned-cast__management"[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.match(managementBlock, /owned-cast__transfer/, "transfer link must live in the management row, not the links row");
  const linksBlock = account.match(/<div class="owned-cast__links"[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.doesNotMatch(linksBlock, /owned-cast__transfer/, "transfer link must not be duplicated into the links row");
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

test("owned-cast__links keeps its original 3-column grid (view/edit sheet/mobile edit only)", () => {
  assert.match(accountActionsCss, /\.owned-cast__links\s*\{\s*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/);
  const linksBlock = account.match(/<div class="owned-cast__links"[\s\S]*?<\/div>/)?.[0] ?? "";
  const linkCount = [...linksBlock.matchAll(/<a /g)].length;
  assert.equal(linkCount, 3, "the links row must keep exactly 3 entries so it stays width-matched with the acts/transfer column below it (see #460)");
});

test("the transfer link sits in the management row's own row/column, clear of the label/duplicate/delete cluster and the troop link", () => {
  assert.match(
    accountActionsCss,
    /\.owned-cast__management > \.owned-cast__transfer\s*\{\s*grid-column:\s*1;\s*grid-row:\s*2;\s*\}/
  );
  // The troop link (when present) and the label/button cluster both live in row 1;
  // the transfer link must not claim row 1 at all.
  assert.doesNotMatch(
    accountActionsCss.match(/\.owned-cast__management > \.owned-cast__transfer[\s\S]{0,120}/)[0],
    /grid-row:\s*1/
  );
});

test("cast-transfer-link.js removes the link when the page has no id", async () => {
  globalThis.location = { search: "" };
  const link = { href: "", removed: false, remove() { this.removed = true; } };
  globalThis.document = { querySelector: selector => (selector === "#cast-transfer-page-link" ? link : null) };
  await import(`../js/cast-transfer-link.js?test=${Date.now()}`);
  assert.equal(link.removed, true);
  assert.equal(link.href, "");
});
