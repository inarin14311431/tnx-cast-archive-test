import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createCastV2Hero,
  createCastV2Outfits,
  createCastV2Overview,
  createCastV2Runtime,
  createCastV2Skills
} from "../js/cast-v2-template.js";

const html = await readFile(new URL("../cast-v2.html", import.meta.url), "utf8");
const runtime = await readFile(new URL("../js/cast-v2.js", import.meta.url), "utf8");
const supabaseClient = await readFile(new URL("../js/supabase-client.js", import.meta.url), "utf8");

test("V2 sample stays on an independent route and links back to the current view", () => {
  assert.match(html, /data-page="cast-v2\.html"/);
  assert.match(html, /id="cast-v2-current-link"[^>]+href="\.\/cast\.html"/);
  assert.match(html, /V2 DESIGN SAMPLE/);
  assert.match(html, /meta name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(html, /js\/cast\.js/);
});

test("V2 sample loads all public cast data through the shared read-only store", () => {
  assert.match(runtime, /Promise\.all\(\[/);
  assert.match(runtime, /getCharacter\(\)/);
  assert.match(runtime, /getSkills\(\)/);
  assert.match(runtime, /getOutfits\(\)/);
  assert.match(runtime, /getCombos\(\)/);
  assert.match(runtime, /tnx:cast-v2-rendered/);
  assert.match(supabaseClient, /\["cast\.html", "cast-v2\.html"\]/);
  assert.match(supabaseClient, /cast\(\?:-v2\)\?\\\.html/);
});

test("V2 hero and overview preserve identity and escape user content", () => {
  const character = {
    public_id: "TNX-SAMPLE",
    character_name: "テスト<script>",
    handle: "“灰街の灯”",
    handle_kana: "“はいがいのあかり”",
    summary: "一言",
    style_1: "フェイト",
    style_1_mark: "◎●",
    divine_1: "真実",
    reason_value: 7,
    reason_control: 12,
    profile: "背景設定"
  };
  const hero = createCastV2Hero(character);
  const overview = createCastV2Overview(character);

  assert.match(hero, /TNX-SAMPLE/);
  assert.match(hero, /“灰街の灯”/);
  assert.match(hero, /“はいがいのあかり”/);
  assert.doesNotMatch(hero, /““/);
  assert.match(hero, /フェイト/);
  assert.match(hero, /真実/);
  assert.match(hero, /テスト&lt;script&gt;/);
  assert.doesNotMatch(hero, /テスト<script>/);
  assert.match(overview, /背景設定/);
  assert.match(overview, /ABILITY \/ CONTROL/);
});

test("V2 detail panels render skill outfit and runtime cards", () => {
  const skills = createCastV2Skills([
    { category: "general", name: "知覚", level: 1, reason: true },
    { category: "style", name: "事情通", level: 2, timing: "常時", description: "解説" }
  ]);
  const outfits = createCastV2Outfits([
    { category: "weapon", name: "護身用拳銃", attack: "P+4", concealment: "12", concealment_penalty: "0" }
  ]);
  const runtimeView = createCastV2Runtime([
    { id: "combo-1", name: "射撃コンボ", skills: "射撃＋知覚", ability: "reason", act_use_limit: 2 }
  ]);

  assert.match(skills, /知覚/);
  assert.match(skills, /事情通/);
  assert.match(skills, /<details class="cast-v2-detail-card">/);
  assert.match(outfits, /護身用拳銃/);
  assert.match(outfits, /攻撃 P\+4/);
  assert.match(runtimeView, /射撃コンボ/);
  assert.match(runtimeView, /使用 2回/);
});
