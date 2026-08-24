const SUPABASE_ORIGIN = "https://koprmbkoftuuffslhsvt.supabase.co";
const AUTH_STORAGE_KEY = "sb-koprmbkoftuuffslhsvt-auth-token";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const CHARACTER_ID = "22222222-2222-4222-8222-222222222222";

export const VISUAL_CAST_ID = "TNX-VISUAL001";
export const VISUAL_TROOP_ID = "TRP-VISUAL001";

const character = Object.freeze({
  id: CHARACTER_ID,
  owner_id: USER_ID,
  public_id: VISUAL_CAST_ID,
  visibility: "public",
  character_name: "夜明けのランナー",
  character_kana: "ヨアケノランナー",
  handle: "ブルー・モーメント",
  handle_kana: "ブルー・モーメント",
  player_name: "VISUAL TESTER",
  affiliation: "N◎VA市政調査局",
  citizen_rank: "B",
  experience_points: 100,
  style_1: "カブキ",
  style_1_mark: "◎",
  style_2: "カゼ",
  style_2_mark: "●",
  style_3: "ニューロ",
  style_3_mark: "",
  image_url: "",
  summary: "都市を駆け、消えたデータの痕跡を追うテスト用キャスト。",
  profile: "夜明け前のハイウェイを仕事場にする情報運搬屋。",
  age: "24",
  gender: "女性",
  height: "168cm",
  weight: "54kg",
  eyes: "青",
  hair: "黒",
  skin: "黄",
  life_path_origin: "ストリート",
  life_path_experience: "メディア",
  life_path_encounter: "好意",
  reason_value: 7,
  reason_control: 12,
  passion_value: 5,
  passion_control: 11,
  life_value: 6,
  life_control: 10,
  mundane_value: 8,
  mundane_control: 13,
  cs: 9,
  divine_1: "チャイ",
  divine_2: "脱出",
  divine_3: "電脳神",
  updated_at: "2026-08-25T00:00:00.000Z"
});

const archiveCharacters = Object.freeze([
  character,
  {
    ...character,
    id: "33333333-3333-4333-8333-333333333333",
    public_id: "TNX-VISUAL002",
    character_name: "境界線の観測者",
    character_kana: "キョウカイセンノカンソクシャ",
    handle: "ホワイトノイズ",
    player_name: "VISUAL TESTER",
    affiliation: "フリーランス",
    experience_points: 85,
    style_1: "トーキー",
    style_1_mark: "◎",
    style_2: "ミストレス",
    style_2_mark: "●",
    style_3: "ニューロ",
    summary: "境界領域からニュースを送り続けるレポーター。",
    updated_at: "2026-08-24T00:00:00.000Z"
  },
  {
    ...character,
    id: "44444444-4444-4444-8444-444444444444",
    public_id: "TNX-VISUAL003",
    character_name: "鋼鉄の番犬",
    character_kana: "コウテツノバンケン",
    handle: "ガーディアン",
    player_name: "SAMPLE PLAYER",
    affiliation: "千早重工後方処理課",
    experience_points: 120,
    style_1: "カブト",
    style_1_mark: "◎",
    style_2: "クグツ",
    style_2_mark: "●",
    style_3: "アラシ",
    summary: "依頼人の生還を最優先に行動する企業戦士。",
    updated_at: "2026-08-23T00:00:00.000Z"
  }
]);

const skills = Object.freeze([
  { id:"skill-1", character_id:CHARACTER_ID, category:"general", skill_kind:"general", name:"操縦", level:2, reason:true, passion:false, life:false, mundane:true, sort_order:10, notes:"ヴィークル全般" },
  { id:"skill-2", character_id:CHARACTER_ID, category:"social", skill_kind:"proper", name:"社会：Ｎ◎ＶＡ", level:2, reason:true, passion:true, life:false, mundane:false, sort_order:20, notes:"" },
  { id:"skill-3", character_id:CHARACTER_ID, category:"connection", skill_kind:"proper", name:"コネ：千早雅之", level:1, reason:false, passion:true, life:false, mundane:false, sort_order:30, notes:"" },
  { id:"skill-4", character_id:CHARACTER_ID, category:"style", skill_kind:"normal", name:"バーンナウト", level:2, reason:false, passion:false, life:false, mundane:true, timing:"メジャー", confrontation:"回避", sort_order:40, notes:"限界を超えて加速する。" }
]);

const outfits = Object.freeze([
  { id:"outfit-1", character_id:CHARACTER_ID, category:"weapon", name:"MP21", purchase_value:"12/4", concealment:"-", attack:"P+6", parry:"1", range:"近", defense:"", description:"携行用小型火器", sort_order:10 },
  { id:"outfit-2", character_id:CHARACTER_ID, category:"armor", name:"ガードコート", purchase_value:"15/5", concealment:"-", defense_s:3, defense_p:4, defense_i:2, description:"軽量防護コート", sort_order:20 },
  { id:"outfit-3", character_id:CHARACTER_ID, category:"vehicle", name:"ナイトホーク", purchase_value:"20/8", concealment:"-", attack:"I+8", speed:"5", control_modifier:"1", cs_modifier:"2", defense_s:5, defense_p:6, defense_i:4, crew:"2", sf:"2", description:"夜間走行仕様", sort_order:30 }
]);

const combos = Object.freeze([
  { id:"combo-1", character_id:CHARACTER_ID, name:"ブルーシフト", skills:"操縦＋バーンナウト", ability:"mundane", modifier:"+3", target_value:"18", timing:"メジャー", target:"単体", range:"近", act_use_limit:2, description:"一瞬で間合いを詰める高速機動。", sort_order:10 },
  { id:"combo-2", character_id:CHARACTER_ID, name:"ゴーストライン", skills:"電脳＋操縦", ability:"reason", modifier:"+1", target_value:"16", timing:"セットアップ", target:"自身", range:"なし", act_use_limit:1, description:"追跡網から走行経路を隠蔽する。", sort_order:20 }
]);

const troop = Object.freeze({
  id: "55555555-5555-4555-8555-555555555555",
  owner_id: USER_ID,
  public_id: VISUAL_TROOP_ID,
  character_id: CHARACTER_ID,
  name: "ブルーライン支援班",
  visibility: "public",
  level: 4,
  member_max: 12,
  style_1: "カタナ",
  utsuwa_attribute: "",
  experience_spent: 60,
  reason_value: 7,
  reason_control: 11,
  passion_value: 6,
  passion_control: 10,
  life_value: 8,
  life_control: 12,
  mundane_value: 9,
  mundane_control: 13,
  skills: [
    { category:"general", kind:"general", name:"射撃", level:2, reason:true, passion:false, life:false, mundane:true, notes:"連携射撃" },
    { category:"style", kind:"normal", name:"修羅", level:2, reason:false, passion:false, life:true, mundane:true, timing:"メジャー", confrontation:"回避", notes:"集中攻撃" }
  ],
  combos: [
    { name:"クロスファイア", skills:"射撃＋修羅", ability:"mundane", modifier:"+2", target_value:"@@TNX_TROOP_COMBO_V1@@{\"expected_value\":\"17\",\"confrontation\":\"回避\"}", timing:"メジャー", target:"単体", range:"中", act_use_limit:2, description:"複数方向から射線を重ねる。" }
  ],
  outfits: [
    { name:"アサルトライフル", attack:"P+7", defense_s:"—", defense_p:"—", defense_i:"—", notes:"部隊標準装備" },
    { name:"タクティカルアーマー", attack:"—", defense_s:4, defense_p:5, defense_i:3, notes:"軽量防護装備" }
  ],
  notes: "キャストの移動と撤退を支援する小規模部隊。",
  updated_at: "2026-08-25T00:00:00.000Z"
});

const ownedCharacters = Object.freeze([
  { id:CHARACTER_ID, public_id:VISUAL_CAST_ID, character_name:character.character_name, handle:character.handle }
]);

function fakeJwt() {
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg:"HS256", typ:"JWT" })}.${encode({ sub:USER_ID, aud:"authenticated", role:"authenticated", exp:4102444800 })}.visual`;
}

function responseForCharacters(url) {
  const select = decodeURIComponent(url.searchParams.get("select") || "");
  if (url.searchParams.has("visibility")) return archiveCharacters;
  if (url.searchParams.has("public_id")) {
    if (select === "id, experience_points") return { id:CHARACTER_ID, experience_points:character.experience_points };
    return character;
  }
  if (url.searchParams.has("id")) return { public_id:VISUAL_CAST_ID, character_name:character.character_name };
  if (url.searchParams.has("owner_id")) return ownedCharacters;
  return archiveCharacters;
}

function responseForTroops(url) {
  if (url.searchParams.has("public_id")) return troop;
  return [troop];
}

export async function installVisualEnvironment(page, { authenticated = false, theme = "nova" } = {}) {
  const user = { id:USER_ID, email:"visual-test@example.invalid", aud:"authenticated", role:"authenticated" };
  if (authenticated) {
    const accessToken = fakeJwt();
    await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
      key:AUTH_STORAGE_KEY,
      session:{ access_token:accessToken, refresh_token:"visual-refresh", expires_in:3600, expires_at:4102444800, token_type:"bearer", user }
    });
  }
  await page.addInitScript(selectedTheme => {
    localStorage.setItem("tnx-cast-site-theme", selectedTheme);
    sessionStorage.clear();
  }, theme);

  await page.route(`${SUPABASE_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (status, body) => route.fulfill({ status, contentType:"application/json", body:JSON.stringify(body) });

    if (url.pathname === "/auth/v1/user") return authenticated ? json(200, user) : json(401, { message:"No session" });
    if (url.pathname === "/rest/v1/rpc/can_use_master_search") return json(200, false);
    if (url.pathname === "/rest/v1/characters") return json(200, responseForCharacters(url));
    if (url.pathname === "/rest/v1/character_skills") return json(200, skills);
    if (url.pathname === "/rest/v1/character_outfits") return json(200, outfits);
    if (url.pathname === "/rest/v1/character_combos") return json(200, combos);
    if (url.pathname === "/rest/v1/character_snapshots") return json(200, []);
    if (url.pathname === "/rest/v1/troops") return json(200, responseForTroops(url));
    if (request.method() === "GET") return json(200, []);
    return json(405, { message:`Unhandled visual route: ${request.method()} ${url.pathname}` });
  });
}

export async function settleVisualPage(page) {
  await Promise.all([400, 700, 900].map(weight => page.addStyleTag({
    url:`/node_modules/@fontsource/noto-sans-jp/${weight}.css`
  })));
  await page.addStyleTag({ url:"/tests/visual/stabilize.css" });
  await page.evaluate(async () => {
    document.querySelectorAll("*").forEach(element => {
      const family = getComputedStyle(element).fontFamily;
      if (!family.includes("Noto Sans JP")) {
        element.style.setProperty("font-family", `${family}, "Noto Sans JP"`);
      }
    });
    await Promise.all([400, 700, 900].map(weight => document.fonts.load(`${weight} 16px "Noto Sans JP"`, "日本語表示確認")));
    await document.fonts.ready;
    const images = [...document.images];
    images.forEach(image => { image.loading = "eager"; });
    await Promise.race([
      Promise.all(images.map(image => image.decode?.().catch(() => {}) ?? Promise.resolve())),
      new Promise(resolve => window.setTimeout(resolve, 1500))
    ]);
    window.scrollTo(0, 0);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
