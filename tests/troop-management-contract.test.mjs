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

test("troop v2 migration adds combos and spent experience", () => {
  const sql = read("supabase/29_troop_rules_v2.sql");
  assert.match(sql, /combos jsonb/i);
  assert.match(sql, /experience_spent integer/i);
  assert.match(sql, /utsuwa_attribute text/i);
});

test("troop rules use one style, derived stats, max members and EXP", () => {
  const html = read("troop.html");
  const js = read("js/troop.js");
  assert.match(html, /CS = TROOP LEVEL/);
  assert.match(html, />AR</);
  assert.match(html, /id="troop-style"/);
  assert.doesNotMatch(html, /id="troop-style-2"/);
  assert.doesNotMatch(html, /troop-member-current/);
  assert.match(html, /消費経験点/);
  assert.match(js, /record\?\.\[key\]\?\.\[0\].*\+ level/);
  assert.match(js, /record\?\.\[key\]\?\.\[1\].*\+ level/);
});

test("troop general and style skills keep suits, auto acquisition and normal costs", () => {
  const html = read("troop.html");
  const js = read("js/troop.js");
  assert.match(html, /一般技能/);
  assert.match(html, /スタイル技能/);
  assert.match(js, /GENERAL_KIND_COST = \{ general:10, proper:5, social:5, connection:5 \}/);
  assert.match(js, /STYLE_COST = \{ none:0, normal:10, secret:20, ultimate:50, direction:2 \}/);
  assert.match(js, /if \(level >= 4\) boxes\.forEach\(box => box\.checked = true\)/);
  assert.match(js, /data-suit=/);
  assert.match(js, /length > 2/);
  assert.match(js, /length > 1/);
});

test("troop supports act-use combo registrations", () => {
  const html = read("troop.html");
  const js = read("js/troop.js");
  assert.match(html, /id="troop-combo-add"/);
  assert.match(html, /組み合わせ技能/);
  assert.match(js, /troop\.combos/);
  assert.match(js, /target_value/);
  assert.match(js, /act_use_limit/);
});

test("account and cast have troop navigation adapters", () => {
  assert.match(read("js/account-mobile-editor-links.js"), /troops\.html/);
  assert.match(read("js/cast-mobile-level-labels.js"), /cast-troops-link\.js/);
  assert.match(read("js/cast-troops-link.js"), /ASSIGNED TROOPS/);
});
