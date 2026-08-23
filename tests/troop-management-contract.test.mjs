import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("troop migration enforces owner RLS and public read", () => {
  const sql = read("supabase/28_troops.sql");
  assert.match(sql, /alter table public\.troops enable row level security/i);
  assert.match(sql, /visibility = 'public' or owner_id = auth\.uid\(\)/i);
  assert.match(sql, /owner_id = auth\.uid\(\)/i);
  assert.match(sql, /linked character must be owned by troop owner/i);
});

test("troop rules expose level, fixed AR, members and skill limits", () => {
  const html = read("troop.html");
  const js = read("js/troop.js");
  assert.match(html, /CS = TROOP LEVEL/);
  assert.match(html, />AR</);
  assert.match(html, /0人で戦闘不能/);
  assert.match(js, /secrets > 2/);
  assert.match(js, /ultimates > 1/);
});

test("account and cast have troop navigation adapters", () => {
  assert.match(read("js/account-mobile-editor-links.js"), /troops\.html/);
  assert.match(read("js/cast-mobile-level-labels.js"), /cast-troops-link\.js/);
  assert.match(read("js/cast-troops-link.js"), /ASSIGNED TROOPS/);
});
