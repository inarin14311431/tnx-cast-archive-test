import { getCharacter, getSkills, getOutfits, getCombos } from "./cast-data-store.js";

const params = new URLSearchParams(location.search);
if (params.get("mobile") !== "1") {
  document.documentElement.classList.remove("mobile-cast-requested");
} else {
  initializeMobileCast();
}

const STYLE_DETAIL_PREFIX = "@@TNX_STYLE_DETAIL_V1@@";
const STYLE_SEPARATOR = "[[STYLE_SEPARATOR]]";
const SUITS = [
  ["reason", "♠", "理性"],
  ["passion", "♣", "感情"],
  ["life", "♥", "生命"],
  ["mundane", "♦", "外界"]
];
const BASE_SKILLS = new Set(["射撃", "心理", "自我", "回避", "白兵", "圧力", "信用"]);
const BASE_PREFIXES = ["操縦："];
const OUTFIT_ORDER = ["weapon", "armor", "cyberware", "tron", "vehicle", "residence", "other"];
const OUTFIT_LABELS = {
  weapon: ["ウェポン", "WEAPON"],
  armor: ["アーマー", "ARMOR"],
  cyberware: ["サイバーウェア", "CYBERWARE"],
  tron: ["トロン", "TRON"],
  vehicle: ["ヴィークル", "VEHICLE"],
  residence: ["住居", "RESIDENCE"],
  other: ["その他", "OTHER"]
};
const OUTFIT_FIELDS = {
  weapon: [["attack", "攻撃力"], ["parry", "受け"], ["range", "射程"], ["concealment", "隠匿"], ["electronic_control", "電制"]],
  armor: [["defense_s", "S"], ["defense_p", "P"], ["defense_i", "I"], ["concealment", "隠匿"], ["electronic_control", "電制"]],
  cyberware: [["concealment", "隠匿"], ["cs_value", "CS"], ["electronic_control", "電制"]],
  tron: [["speed", "スロット"], ["tron_software", "ソフト"], ["tron_support", "サポート"], ["tron_hardware", "ハード"], ["cs_value", "CS"], ["concealment", "隠匿"], ["electronic_control", "電制"]],
  vehicle: [["attack", "攻撃"], ["parry", "受け"], ["speed", "速度"], ["defense_s", "S"], ["defense_p", "P"], ["defense_i", "I"], ["cs_value", "CS"], ["crew", "乗員"], ["sf", "SF"], ["concealment", "隠匿"], ["electronic_control", "電制"]],
  residence: [["residence_entry", "登場"], ["residence_electric", "電"], ["residence_area", "エリア"], ["speed", "スロット"], ["electronic_control", "電制"]],
  other: [["concealment", "隠匿"], ["cs_value", "CS"], ["electronic_control", "電制"]]
};

async function initializeMobileCast() {
  document.body?.classList.add("is-mobile-cast-view");
  const root = document.querySelector("#mobile-cast-view");
  if (!root) return;
  root.hidden = false;
  root.innerHTML = `<div class="mobile-cast-loading"><b>CAST DATA</b><span>SCANNING...</span></div>`;

  try {
    const [character, skills, outfits, combos] = await Promise.all([
      getCharacter(), getSkills(), getOutfits(), getCombos()
    ]);
    if (!character) throw new Error("指定されたキャストは存在しません。");
    render(root, character, skills, outfits, combos);
    document.title = `${character.character_name || "CAST"} // MOBILE CAST VIEW`;
  } catch (error) {
    console.error("Mobile cast view failed", error);
    root.innerHTML = `<section class="mobile-cast-error"><b>ACCESS FAILED</b><p>${esc(error?.message || "キャスト情報の取得に失敗しました。")}</p><a href="./index.html">キャスト一覧へ戻る</a></section>`;
  }
}

function render(root, character, skills, outfits, combos) {
  const general = skills.filter(item => item.category === "general");
  const social = skills.filter(item => item.category === "social");
  const connection = skills.filter(item => item.category === "connection");
  const styleSkills = skills.filter(item => item.category === "style");
  const desktopUrl = new URL(location.href);
  desktopUrl.searchParams.delete("mobile");

  root.innerHTML = `
    <header class="mobile-cast-topbar">
      <a href="./index.html" class="mobile-cast-topbar__back">‹ CAST ARCHIVE</a>
      <span>${esc(character.public_id || "")}</span>
      <a href="${esc(desktopUrl.href)}" class="mobile-cast-topbar__desktop">PC表示</a>
    </header>
    <main class="mobile-cast-main">
      ${renderHero(character)}
      ${renderAbilitySection(character)}
      ${renderProfileSection(character)}
      ${renderSkillSection("一般技能", "GENERAL SKILLS", general, "general")}
      ${renderSkillSection("社会", "SOCIAL", social, "compact")}
      ${renderSkillSection("コネ", "CONNECTIONS", connection, "compact")}
      ${renderStyleSkills(styleSkills)}
      ${renderOutfits(outfits)}
      ${renderCombos(combos)}
    </main>
    <footer class="mobile-cast-footer">N◎VA MUNICIPAL DATABASE // MOBILE VIEW</footer>`;

  root.querySelectorAll("img").forEach(image => image.addEventListener("error", () => {
    image.src = "./assets/placeholders/scan-failed.webp";
  }, { once: true }));
}

function renderHero(character) {
  const styles = [1, 2, 3].map(index => ({
    name: character[`style_${index}`],
    mark: character[`style_${index}_mark`],
    divine: character[`divine_${index}`]
  })).filter(item => item.name || item.divine);
  const image = character.image_url || "./assets/placeholders/scan-failed.webp";

  return `<section class="mobile-cast-hero">
    <div class="mobile-cast-portrait"><img src="${esc(image)}" alt="${esc(character.character_name || "キャスト画像")}"></div>
    <div class="mobile-cast-identity">
      ${character.handle ? `<p class="mobile-cast-handle">${esc(character.handle)}</p>` : ""}
      <h1>${esc(character.character_name || "NO NAME")}</h1>
      ${character.character_kana ? `<p class="mobile-cast-kana">${esc(character.character_kana)}</p>` : ""}
      <div class="mobile-cast-styles">${styles.map(item => `<span><b>${esc(item.name || "—")}</b>${item.mark ? `<em>${esc(item.mark)}</em>` : ""}</span>`).join("")}</div>
      <dl class="mobile-cast-meta">
        ${meta("PLAYER", character.player_name)}
        ${meta("AFFILIATION", character.affiliation)}
        ${meta("RANK", character.citizen_rank)}
        ${meta("EXP", character.experience_points ?? 0)}
      </dl>
    </div>
    ${styles.length ? `<div class="mobile-cast-divines">${styles.map(item => `<article><span>${esc(item.name || "STYLE")}</span><strong>${esc(item.divine || "—")}</strong></article>`).join("")}</div>` : ""}
    ${character.summary ? `<p class="mobile-cast-summary">${nl2br(character.summary)}</p>` : ""}
  </section>`;
}

function renderAbilitySection(character) {
  const cards = [
    ["♠", "理性", character.reason_value, character.reason_control],
    ["♣", "感情", character.passion_value, character.passion_control],
    ["♥", "生命", character.life_value, character.life_control],
    ["♦", "外界", character.mundane_value, character.mundane_control]
  ];
  return section("能力値／制御値", "ABILITY / CONTROL", `
    <div class="mobile-cast-abilities">
      ${cards.map(([suit, name, value, control]) => `<article><header><b>${suit}</b><span>${name}</span></header><div><span>能力<strong>${display(value)}</strong></span><span>制御<strong>${display(control)}</strong></span></div></article>`).join("")}
      <article class="is-cs"><header><b>CS</b></header><div><span>CURRENT<strong>${display(character.cs)}</strong></span></div></article>
    </div>`);
}

function renderProfileSection(character) {
  const personal = [
    ["年齢", character.age], ["性別", character.gender], ["身長", character.height], ["体重", character.weight],
    ["瞳", character.eyes], ["髪", character.hair], ["肌", character.skin]
  ].filter(([, value]) => hasValue(value));
  const lifePath = [
    ["出自", character.life_path_origin], ["経験", character.life_path_experience], ["邂逅", character.life_path_encounter]
  ].filter(([, value]) => hasValue(value));
  if (!personal.length && !lifePath.length && !character.profile) return "";

  return section("プロフィール", "PROFILE", `
    ${personal.length ? `<dl class="mobile-cast-profile-grid">${personal.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>` : ""}
    ${lifePath.length ? `<div class="mobile-cast-lifepath">${lifePath.map(([label, value]) => `<p><span>${label}</span><b>${esc(value)}</b></p>`).join("")}</div>` : ""}
    ${character.profile ? `<div class="mobile-cast-profile-text">${nl2br(character.profile)}</div>` : ""}`);
}

function renderSkillSection(title, english, items, mode) {
  if (!items.length) return "";
  const rows = items.map(skill => `<article class="mobile-skill-row ${mode === "compact" ? "is-compact" : ""}">
    <div class="mobile-skill-row__main">
      <strong>${isBaseSkill(skill.name) ? '<i class="mobile-base-star">★</i>' : ""}${esc(skill.name || "—")}</strong>
      <b>LV ${esc(skill.level ?? 0)}</b>
    </div>
    ${renderSuits(skill)}
  </article>`).join("");
  return section(title, english, `<div class="mobile-skill-list">${rows}</div>`);
}

function renderStyleSkills(items) {
  if (!items.length) return "";
  const cards = items.map(skill => {
    const detail = parseStyleDetail(skill.description);
    if (String(detail.description || "").startsWith(STYLE_SEPARATOR)) {
      return `<div class="mobile-style-separator">${esc(skill.name || "STYLE SECTION")}</div>`;
    }
    const fields = [
      ["技能", detail.skill], ["上限", detail.limit], ["タイミング", detail.timing], ["対象", detail.target],
      ["射程", detail.range], ["目標値", detail.difficulty], ["対決", detail.confrontation], ["参照", detail.page]
    ].filter(([, value]) => hasValue(value));
    return `<article class="mobile-style-card">
      <header><div><strong>${esc(skill.name || "—")}</strong>${skill.skill_kind ? `<small>${esc(skillKind(skill.skill_kind))}</small>` : ""}</div><b>LV ${esc(skill.level ?? 0)}</b></header>
      ${renderSuits(skill)}
      ${fields.length ? `<dl>${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>` : ""}
      ${detail.description ? `<p>${nl2br(detail.description)}</p>` : ""}
    </article>`;
  }).join("");
  return section("スタイル技能", "STYLE SKILLS", `<div class="mobile-style-list">${cards}</div>`);
}

function renderOutfits(items) {
  if (!items.length) return "";
  const groups = OUTFIT_ORDER.map(category => [category, items.filter(item => item.category === category)]).filter(([, values]) => values.length);
  const armor = items.filter(item => item.category === "armor");
  const armorTotal = armor.length ? armor.reduce((total, item) => ({
    s: total.s + numeric(item.defense_s), p: total.p + numeric(item.defense_p), i: total.i + numeric(item.defense_i)
  }), { s: 0, p: 0, i: 0 }) : null;

  const content = `${armorTotal ? `<div class="mobile-armor-total"><span>防具・防御値合計</span><strong>S ${armorTotal.s} / P ${armorTotal.p} / I ${armorTotal.i}</strong></div>` : ""}
    ${groups.map(([category, values]) => {
      const [jp, en] = OUTFIT_LABELS[category];
      return `<section class="mobile-outfit-group"><header><h3>${jp}</h3><small>${en}</small></header><div>${values.map(item => renderOutfitCard(item, category)).join("")}</div></section>`;
    }).join("")}`;
  return section("アウトフィット", "OUTFITS", content);
}

function renderOutfitCard(item, category) {
  const fields = (OUTFIT_FIELDS[category] || []).filter(([key]) => hasValue(item[key]));
  return `<article class="mobile-outfit-card">
    <header><strong>${esc(item.name || "—")}</strong></header>
    ${fields.length ? `<dl>${fields.map(([key, label]) => `<div><dt>${label}</dt><dd>${esc(item[key])}</dd></div>`).join("")}</dl>` : ""}
    ${item.description ? `<p>${nl2br(item.description)}</p>` : ""}
  </article>`;
}

function renderCombos(items) {
  if (!items.length) return "";
  const cards = items.map(item => {
    const fields = [
      ["技能", item.skills || item.skill], ["能力", item.ability || item.ability_key], ["修正", item.modifier],
      ["タイミング", item.timing], ["対象", item.target], ["射程", item.range], ["目標値", item.difficulty], ["対決", item.confrontation]
    ].filter(([, value]) => hasValue(value));
    return `<article class="mobile-combo-card"><header><strong>${esc(item.name || "COMBO")}</strong></header>${fields.length ? `<dl>${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>` : ""}${item.description || item.effect ? `<p>${nl2br(item.description || item.effect)}</p>` : ""}</article>`;
  }).join("");
  return section("コンボ", "COMBOS", `<div class="mobile-combo-list">${cards}</div>`);
}

function renderSuits(skill) {
  return `<div class="mobile-suits" aria-label="スート">${SUITS.map(([key, mark, label]) => `<span class="${skill[key] ? "is-active" : ""}" title="${label}">${mark}</span>`).join("")}</div>`;
}

function parseStyleDetail(value) {
  const empty = { skill: "", limit: "", timing: "", target: "", range: "", difficulty: "", confrontation: "", description: "", page: "" };
  const text = String(value || "");
  if (text.startsWith(STYLE_DETAIL_PREFIX)) {
    try { return { ...empty, ...JSON.parse(text.slice(STYLE_DETAIL_PREFIX.length).trim()) }; }
    catch { return { ...empty, description: text }; }
  }
  const labels = { "技能": "skill", "上限": "limit", "タイミング": "timing", "対象": "target", "射程": "range", "目標値": "difficulty", "対決": "confrontation", "解説": "description", "参照": "page", "参照P": "page" };
  const output = { ...empty }, rest = [];
  text.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^：:]+)[：:]\s*(.*)$/);
    const key = match && labels[match[1].trim()];
    if (key) output[key] = match[2]; else if (line.trim()) rest.push(line);
  });
  if (!output.description) output.description = rest.join("\n");
  return output;
}

function section(japanese, english, body) {
  return `<section class="mobile-cast-section"><header class="mobile-cast-section__title"><h2>${japanese}</h2><small>${english}</small></header>${body}</section>`;
}

function meta(label, value) {
  return `<div><dt>${label}</dt><dd>${esc(hasValue(value) ? value : "—")}</dd></div>`;
}

function skillKind(value) {
  return ({ none: "なし", normal: "通常", secret: "秘技", ultimate: "奥義", direction: "演出" })[value] || value;
}

function isBaseSkill(value) {
  const name = String(value || "").trim().replace(/^★\s*/, "").replace(/[;；]/g, "：");
  return BASE_SKILLS.has(name) || BASE_PREFIXES.some(prefix => name.startsWith(prefix));
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function display(value) {
  return esc(hasValue(value) ? value : "—");
}

function numeric(value) {
  const match = String(value ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function nl2br(value) {
  return esc(value).replace(/\r?\n/g, "<br>");
}

function esc(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
