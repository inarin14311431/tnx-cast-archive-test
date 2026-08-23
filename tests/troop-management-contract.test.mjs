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

test("troop editor separates management and basic data", () => {
  const html = read("troop.html");
  assert.match(html, /管理機能 <small>MANAGEMENT<\/small>/);
  assert.match(html, /基本情報 <small>BASIC DATA<\/small>/);
  assert.match(html, /公開状況/);
  assert.match(html, /紐づけキャスト/);
  assert.match(html, /名称/);
  assert.match(html, /トループレベル/);
  assert.match(html, /最大人数/);
});

test("troop general skills are selected and named skills support details", () => {
  const ui = read("js/troop-editor-ui.js");
  assert.match(ui, /GENERAL_MASTER_ROWS/);
  assert.match(ui, /dataGeneralSkillSelect|generalSkillSelect/i);
  assert.match(ui, /製作：/);
  assert.match(ui, /芸術：/);
  assert.match(ui, /操縦：/);
  assert.match(ui, /troop-general-skill-detail/);
});

test("troop suits use outline and filled suit toggles", () => {
  const ui = read("js/troop-editor-ui.js");
  const css = read("css-next/pages/troops.css");
  assert.match(ui, /off:"♡", on:"♥"/);
  assert.match(ui, /off:"♤", on:"♠"/);
  assert.match(css, /attr\(data-off\)/);
  assert.match(css, /attr\(data-on\)/);
});

test("utsuwa attribute is strictly hidden except for utsuwa", () => {
  const html = read("troop.html");
  const js = read("js/troop.js");
  const css = read("css-next/pages/troops.css");
  assert.match(html, /id="troop-utsuwa-wrap" hidden/);
  assert.match(js, /hidden = !isUtsuwa/);
  assert.match(css, /#troop-editor \[hidden\][^{]*\{display:none!important\}/);
});

test("troop general and style skills keep normal EXP rules", () => {
  const js = read("js/troop.js");
  assert.match(js, /GENERAL_KIND_COST = \{ general:10, proper:5, social:5, connection:5 \}/);
  assert.match(js, /STYLE_COST = \{ none:0, normal:10, secret:20, ultimate:50, direction:2 \}/);
  assert.match(js, /if \(level >= 4\) boxes\.forEach\(box => box\.checked = true\)/);
  assert.match(js, /length > 2/);
  assert.match(js, /length > 1/);
});

test("troop combos reuse the existing combo-card and combo-dialog UI model", () => {
  const html = read("troop.html");
  const ui = read("js/troop-editor-ui.js");
  assert.match(html, /class="combo-dialog"/);
  assert.match(html, /class="combo-form-grid"/);
  assert.match(ui, /class="combo-card"/);
  assert.match(ui, /target_value/);
  assert.match(ui, /act_use_limit/);
});

test("account and cast have troop navigation adapters", () => {
  assert.match(read("js/account-mobile-editor-links.js"), /troops\.html/);
  assert.match(read("js/cast-mobile-level-labels.js"), /cast-troops-link\.js/);
  assert.match(read("js/cast-troops-link.js"), /ASSIGNED TROOPS/);
});
