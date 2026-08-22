import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile transfer helper uses bookmarklet and clipboard flow without direct POST", async () => {
  const [html, controller] = await Promise.all([
    read("mobile-transfer.html"),
    read("js/mobile-bookmarklet-transfer.js")
  ]);

  assert.match(html, /MOBILE BOOKMARKLET TRANSFER/);
  assert.match(html, /transfer-bookmarklet-copy-button|mobile-transfer-bookmarklet-slot/);
  assert.match(html, /character-sheets\.appspot\.com\/tnx\/edit\.html/);
  assert.doesNotMatch(html, /character-sheets\.appspot\.com\/tnx\/register/);
  assert.doesNotMatch(controller, /fetch\s*\(.*character-sheets/);
  assert.match(controller, /transfer-tsv-export\.js/);
});

test("mobile cast transfer trigger routes to the bookmarklet helper while desktop keeps POST", async () => {
  const adapter = await read("js/direct-transfer-button-post.js");

  assert.match(adapter, /direct-transfer-button--mobile/);
  assert.match(adapter, /mobile-transfer\.html\?id=/);
  assert.match(adapter, /transfer\.html\?embed=1&id=/);
  assert.match(adapter, /isMobileBookmarkletTrigger/);
});

test("bookmarklet retains paste fallback for mobile clipboard restrictions", async () => {
  const bookmarklet = await read("js/tnx-transfer-bookmarklet.js");

  assert.match(bookmarklet, /navigator\.clipboard\.readText/);
  assert.match(bookmarklet, /prompt\("転記TSVを貼り付けてください。"/);
  assert.match(bookmarklet, /TNX_CAST_TRANSFER_TSV/);
});
