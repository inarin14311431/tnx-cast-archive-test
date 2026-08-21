import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("active cast transfer route uses the preserved POST adapter", async () => {
  const router = await read("js/direct-transfer-button.js");
  const postDialog = await read("js/direct-transfer-button-post.js");
  const postPage = await read("transfer.html");
  const postScript = await read("js/transfer.js");

  assert.match(router, /ACTIVE_MODE = "post"/);
  assert.match(router, /POST_ADAPTER = "\.\/direct-transfer-button-post\.js\?v=2"/);
  assert.match(router, /ensureEditorTrigger/);
  assert.match(router, /data-direct-transfer-trigger/);
  assert.match(postDialog, /transfer\.html\?embed=1/);
  assert.match(postPage, /transfer-form/);
  assert.match(postScript, /https:\/\/character-sheets\.appspot\.com\/tnx\/register/);
  assert.match(postScript, /outbound\.method = "POST"/);
});

test("desktop editor exposes one POST transfer action through the shared router", async () => {
  const features = await read("js/sheet-features.js");
  const router = await read("js/direct-transfer-button.js");
  const supabaseClient = await read("js/supabase-client.js");

  assert.match(features, /import "\.\/direct-transfer-button\.js\?v=6"/);
  assert.doesNotMatch(supabaseClient, /transfer-tsv-export\.js/);
  assert.match(router, /document\.body\?\.dataset\.page !== "sheet\.html"/);
  assert.match(router, /button\.id = "direct-transfer-button"/);
  assert.match(router, /CHARACTER SHEETS \/ POST/);
  assert.match(router, /removeInactiveBookmarkletActions/);
});

test("bookmarklet transfer implementation remains stored while POST is active", async () => {
  const router = await read("js/direct-transfer-button.js");
  const exporter = await read("js/transfer-tsv-export.js");
  const bookmarklet = await read("js/tnx-transfer-bookmarklet.js");

  assert.doesNotMatch(router, /import\("\.\/transfer-tsv-export\.js/);
  assert.match(exporter, /TNX_CAST_TRANSFER_TSV/);
  assert.match(exporter, /転記TSV/);
  assert.match(exporter, /転記BM/);
  assert.match(exporter, /tnx-transfer-bookmarklet\.js\?v=2/);
  assert.match(bookmarklet, /TNX_CAST_TRANSFER_TSV/);
});

test("bookmarklet exporter keeps armor control and SPI mapping for rollback compatibility", async () => {
  const exporter = await read("js/transfer-tsv-export.js");

  assert.match(exporter, /category === "armor" \? \(details\.control_value \|\| legacy\.control \|\| ""\)/);
  assert.match(exporter, /protecS: details\.defense_s/);
  assert.match(exporter, /protecP: details\.defense_p/);
  assert.match(exporter, /protecI: details\.defense_i/);
});
