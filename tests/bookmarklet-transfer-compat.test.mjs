import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("active cast transfer route uses the production bookmarklet adapter", async () => {
  const router = await read("js/direct-transfer-button.js");
  const exporter = await read("js/transfer-tsv-export.js");

  assert.match(router, /ACTIVE_MODE = "bookmarklet"/);
  assert.match(router, /import\("\.\/transfer-tsv-export\.js\?v=1"\)/);
  assert.match(router, /removeInactivePostTriggers/);
  assert.match(exporter, /TNX_CAST_TRANSFER_TSV/);
  assert.match(exporter, /転記TSV/);
  assert.match(exporter, /転記BM/);
  assert.match(exporter, /tnx-transfer-bookmarklet\.js\?v=2/);
});

test("desktop editor owns bookmarklet transfer through the shared router", async () => {
  const features = await read("js/sheet-features.js");
  const sidebar = await read("js/sheet-sidebar-actions.js");
  const supabaseClient = await read("js/supabase-client.js");

  assert.match(features, /import "\.\/direct-transfer-button\.js\?v=6"/);
  assert.doesNotMatch(supabaseClient, /transfer-tsv-export\.js/);
  assert.match(sidebar, /const VIEWER_ONLY_ACTION = \/ココフォリア\|ユドナリウム\//);
  assert.match(sidebar, /transferTsv: \/転記TSV\//);
  assert.match(sidebar, /transferBm: \/転記BM\//);
  assert.match(sidebar, /#transfer-tsv-copy-button/);
  assert.match(sidebar, /#transfer-bookmarklet-copy-button/);
  assert.match(sidebar, /キャストを閲覧\|転記TSV\|転記BM\|データ取込/);
});

test("production bookmarklet exporter keeps armor control and SPI mapping", async () => {
  const exporter = await read("js/transfer-tsv-export.js");

  assert.match(exporter, /category === "armor" \? \(details\.control_value \|\| legacy\.control \|\| ""\)/);
  assert.match(exporter, /protecS: details\.defense_s/);
  assert.match(exporter, /protecP: details\.defense_p/);
  assert.match(exporter, /protecI: details\.defense_i/);
});

test("POST transfer implementation remains stored but inactive on normal cast view", async () => {
  const router = await read("js/direct-transfer-button.js");
  const postDialog = await read("js/direct-transfer-button-post.js");
  const postPage = await read("transfer.html");
  const postScript = await read("js/transfer.js");

  assert.doesNotMatch(router, /transfer\.html\?embed=1/);
  assert.match(postDialog, /transfer\.html\?embed=1/);
  assert.match(postPage, /transfer-form/);
  assert.match(postScript, /https:\/\/character-sheets\.appspot\.com\/tnx\/register/);
  assert.match(postScript, /outbound\.method = "POST"/);
});

test("mobile direct POST trigger is removed when bookmarklet mode is active", async () => {
  const router = await read("js/direct-transfer-button.js");
  assert.match(router, /DIRECT_TRIGGER_SELECTOR = "\[data-direct-transfer-trigger\], #direct-transfer-button"/);
  assert.match(router, /MutationObserver/);
  assert.match(router, /node\.remove\(\)/);
});
