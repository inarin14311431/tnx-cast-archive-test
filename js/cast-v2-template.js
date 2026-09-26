import { displayValue, formatHandle } from "./cast-display-format.js?v=1";
import { escapeAttribute, escapeHtml } from "./dom-escape.js";
import { COMBO_ABILITY_LABELS, getComboActUseLimit, getComboSkills, getComboValue, isSkillCounterCombo } from "./cast-combo-rules.js?v=2";
import { formatConcealmentPair, formatPurchasePair } from "./outfit-view-model.js?v=3";
import { OUTFIT_CATEGORY_LABELS } from "./cast-view-definitions.js?v=3";

const SUITS = [
  ["reason", "♠"],
  ["passion", "♣"],
  ["life", "♥"],
  ["mundane", "♦"]
];

const ABILITIES = [
  ["理性", "REASON", "♠", "reason_value", "reason_control"],
  ["感情", "PASSION", "♣", "passion_value", "passion_control"],
  ["生命", "LIFE", "♥", "life_value", "life_control"],
  ["外界", "MUNDANE", "♦", "mundane_value", "mundane_control"]
];

export function createCastV2Hero(character) {
  const styles = [1, 2, 3]
    .map(index => ({
      name: character[`style_${index}`],
      mark: character[`style_${index}_mark`],
      divine: character[`divine_${index}`]
    }))
    .filter(style => style.name || style.divine);

  return `
    <div class="cast-v2-portrait">
      <img id="cast-v2-image" src="${escapeAttribute(character.image_url || "./assets/placeholders/scan-failed.webp")}" alt="${escapeAttribute(character.character_name || "キャスト画像")}">
      <div class="cast-v2-portrait__trace"><span>VISUAL IDENTITY</span><span>TRACE // VERIFIED</span></div>
      <div class="cast-v2-portrait__caption"><strong>人物画像</strong><small>CAST PORTRAIT</small></div>
    </div>
    <div class="cast-v2-identity">
      <p class="cast-v2-eyebrow"><span>N◎VA CAST PROFILE</span><span>${escapeHtml(character.public_id || "NO ID")}</span></p>
      <p class="cast-v2-reading">${escapeHtml(joinReading(character.handle_kana, character.character_kana))}</p>
      <h1 class="cast-v2-name">${escapeHtml(displayValue(character.character_name))}</h1>
      <p class="cast-v2-handle">${escapeHtml(formatHandle(character.handle))}</p>
      <p class="cast-v2-summary">${escapeHtml(character.summary || "キャストの一言は登録されていません。")}</p>
      <div class="cast-v2-style-grid">
        ${styles.map((style, index) => `
          <article class="cast-v2-style">
            <span>STYLE ${String(index + 1).padStart(2, "0")}</span>
            <strong>${escapeHtml(style.name || "UNREGISTERED")}</strong>
            ${style.mark ? `<em aria-label="${escapeAttribute(style.mark)}">${escapeHtml(style.mark)}</em>` : ""}
            <small>${escapeHtml(style.divine || "神業未登録")}</small>
          </article>
        `).join("")}
      </div>
      <dl class="cast-v2-identity-grid">
        ${identityFact("プレイヤー", "PLAYER", character.player_name)}
        ${identityFact("所属", "AFFILIATION", character.affiliation)}
        ${identityFact("市民ランク", "CITIZEN RANK", character.citizen_rank)}
        ${identityFact("消費経験点", "EXP SPENT", `${character.experience_points ?? 0} EXP`)}
      </dl>
    </div>
  `;
}

export function createCastV2Overview(character) {
  const personal = [
    ["年齢", "AGE", character.age],
    ["性別", "GENDER", character.gender],
    ["身長", "HEIGHT", character.height],
    ["体重", "WEIGHT", character.weight],
    ["瞳", "EYES", character.eyes],
    ["髪", "HAIR", character.hair],
    ["肌", "SKIN", character.skin]
  ];
  const lifePath = [
    ["出自", "ORIGIN", character.life_path_origin],
    ["経験", "EXPERIENCE", character.life_path_experience],
    ["邂逅", "ENCOUNTER", character.life_path_encounter]
  ];

  return `
    ${section("能力値／制御値", "ABILITY / CONTROL", `
      <div class="cast-v2-ability-grid">
        ${ABILITIES.map(([jp, en, symbol, valueKey, controlKey]) => abilityCard(jp, en, symbol, character[valueKey], character[controlKey])).join("")}
        <article class="cast-v2-ability cast-v2-ability--cs">
          <span>CS / CURRENT</span>
          <dl><div><dt>現在値</dt><dd>${escapeHtml(displayValue(character.cs))}</dd></div></dl>
        </article>
      </div>
    `)}
    <div class="cast-v2-overview-grid">
      ${section("背景設定", "PROFILE", `<p class="cast-v2-profile-text">${escapeHtml(character.profile?.trim() || "プロフィールは登録されていません。")}</p>`)}
      ${section("人物情報", "PERSONAL DATA", `
        <dl class="cast-v2-fact-list">
          ${personal.map(([jp, en, value]) => `<div><dt>${escapeHtml(jp)} <small>${escapeHtml(en)}</small></dt><dd>${escapeHtml(displayValue(value))}</dd></div>`).join("")}
        </dl>
        <div class="cast-v2-lifepath">
          ${lifePath.map(([jp, en, value]) => `<article><span>${escapeHtml(jp)} / ${escapeHtml(en)}</span><strong>${escapeHtml(displayValue(value))}</strong></article>`).join("")}
        </div>
      `)}
    </div>
  `;
}

export function createCastV2Skills(skills) {
  const groups = [
    ["general", "一般技能", "GENERAL"],
    ["social", "社会", "SOCIAL"],
    ["connection", "コネ", "CONNECTIONS"]
  ];
  const styleSkills = skills.filter(skill => skill.category === "style");

  return `
    ${section("一般技能・社会・コネ", "CORE SKILLS", `
      <div class="cast-v2-skill-groups">
        ${groups.map(([category, jp, en]) => {
          const items = skills.filter(skill => skill.category === category);
          return `<section><header class="cast-v2-section__header"><h2>${jp}</h2><small>${en}</small></header><div class="cast-v2-section__body cast-v2-skill-list">${items.length ? items.map(coreSkillRow).join("") : empty("NO DATA")}</div></section>`;
        }).join("")}
      </div>
    `)}
    ${section("スタイル技能", "STYLE SKILLS", styleSkills.length
      ? `<div class="cast-v2-style-skills">${styleSkills.map(styleSkillCard).join("")}</div>`
      : empty("NO STYLE SKILL DATA"))}
  `;
}

export function createCastV2Outfits(outfits) {
  if (!outfits.length) return section("アウトフィット", "OUTFITS", empty("NO OUTFIT DATA"));
  const categories = [...new Set(outfits.map(outfit => outfit.category))];
  return section("アウトフィット", "OUTFITS", categories.map(category => {
    const items = outfits.filter(outfit => outfit.category === category);
    return `
      <section class="cast-v2-category">
        <h3>${escapeHtml(OUTFIT_CATEGORY_LABELS[category] || category || "その他")}</h3>
        <div class="cast-v2-outfit-grid">${items.map(outfitCard).join("")}</div>
      </section>
    `;
  }).join(""));
}

export function createCastV2Runtime(combos) {
  return section("コンボ／技能カウンター", "ACT RUNTIME", combos.length
    ? `<div class="cast-v2-combo-grid">${combos.map(comboCard).join("")}</div>`
    : empty("NO COMBO DATA"));
}

function identityFact(jp, en, value) {
  return `<div><dt>${escapeHtml(jp)} <small>${escapeHtml(en)}</small></dt><dd>${escapeHtml(displayValue(value))}</dd></div>`;
}

function joinReading(handleKana, characterKana) {
  return [handleKana ? `“${handleKana}”` : "", characterKana].filter(Boolean).join(" / ");
}

function section(title, subtitle, content) {
  return `<section class="cast-v2-section"><header class="cast-v2-section__header"><h2>${escapeHtml(title)}</h2><small>${escapeHtml(subtitle)}</small></header><div class="cast-v2-section__body">${content}</div></section>`;
}

function abilityCard(jp, en, symbol, value, control) {
  return `
    <article class="cast-v2-ability">
      <span>${escapeHtml(symbol)} ${escapeHtml(jp)} / ${escapeHtml(en)}</span>
      <dl>
        <div><dt>能力</dt><dd>${escapeHtml(displayValue(value))}</dd></div>
        <div><dt>制御</dt><dd>${escapeHtml(displayValue(control))}</dd></div>
      </dl>
    </article>
  `;
}

function coreSkillRow(skill) {
  return `
    <article class="cast-v2-skill-row">
      <strong>${escapeHtml(skill.name || "名称未登録")}</strong>
      <span>LV ${escapeHtml(displayValue(skill.level))}</span>
      ${suitList(skill)}
    </article>
  `;
}

function styleSkillCard(skill) {
  const meta = [
    skill.kind ? `種別 ${skill.kind}` : "",
    skill.skill ? `技能 ${skill.skill}` : "",
    skill.timing ? `時 ${skill.timing}` : "",
    skill.target ? `対象 ${skill.target}` : "",
    skill.range ? `射程 ${skill.range}` : "",
    skill.difficulty ? `目標 ${skill.difficulty}` : "",
    skill.confrontation ? `対決 ${skill.confrontation}` : "",
    skill.page_number ? `P.${skill.page_number}` : ""
  ].filter(Boolean);
  return `
    <details class="cast-v2-detail-card">
      <summary><span><strong>${escapeHtml(skill.name || "名称未登録")}</strong><small>LV ${escapeHtml(displayValue(skill.level))}　${suitText(skill)}</small></span></summary>
      <div class="cast-v2-detail-card__body">
        <div class="cast-v2-meta-chips">${meta.map(value => `<span>${escapeHtml(value)}</span>`).join("")}</div>
        ${skill.description ? `<p>${escapeHtml(skill.description)}</p>` : ""}
      </div>
    </details>
  `;
}

function suitList(skill) {
  return `<span class="cast-v2-suits">${SUITS.map(([key, symbol]) => `<i class="${skill[key] ? "is-on" : ""}" aria-label="${symbol}${skill[key] ? "取得済み" : "未取得"}">${symbol}</i>`).join("")}</span>`;
}

function suitText(skill) {
  return SUITS.filter(([key]) => skill[key]).map(([, symbol]) => symbol).join(" ") || "スートなし";
}

function outfitCard(outfit) {
  const defense = [outfit.defense_s, outfit.defense_p, outfit.defense_i].some(hasValue)
    ? `防御 S${valueOrDash(outfit.defense_s)} / P${valueOrDash(outfit.defense_p)} / I${valueOrDash(outfit.defense_i)}`
    : "";
  const meta = [
    `購入 ${formatPurchasePair(outfit)}`,
    `隠匿 ${formatConcealmentPair(outfit)}`,
    outfit.attack ? `攻撃 ${outfit.attack}` : "",
    outfit.parry ? `受け ${outfit.parry}` : "",
    outfit.range ? `射程 ${outfit.range}` : "",
    defense,
    outfit.control_modifier ? `制御 ${outfit.control_modifier}` : "",
    outfit.cs_modifier ? `CS ${outfit.cs_modifier}` : "",
    outfit.electronic_control ? `電制 ${outfit.electronic_control}` : "",
    outfit.slot ? `部位 ${outfit.slot}` : ""
  ].filter(Boolean);
  return `
    <article class="cast-v2-outfit-card">
      <header><h4>${escapeHtml(outfit.name || "名称未登録")}</h4><span>${escapeHtml(String(outfit.category || "OTHER").toUpperCase())}</span></header>
      <div class="cast-v2-meta-chips">${meta.map(value => `<span>${escapeHtml(value)}</span>`).join("")}</div>
      ${outfit.description ? `<p>${escapeHtml(outfit.description)}</p>` : ""}
    </article>
  `;
}

function comboCard(combo) {
  const limit = getComboActUseLimit(combo);
  const skills = getComboSkills(combo);
  const abilityKey = getComboValue(combo.ability, combo.ability_key).toLowerCase();
  const counter = isSkillCounterCombo(combo);
  const meta = [
    abilityKey ? (COMBO_ABILITY_LABELS[abilityKey] || abilityKey) : "",
    combo.modifier ? `修正 ${combo.modifier}` : "",
    getComboValue(combo.target_value, combo.achievement) ? `達成 ${getComboValue(combo.target_value, combo.achievement)}` : "",
    combo.timing ? `時 ${combo.timing}` : "",
    combo.target ? `対象 ${combo.target}` : "",
    combo.range ? `射程 ${combo.range}` : "",
    limit ? `使用 ${limit}回` : ""
  ].filter(Boolean);
  const description = getComboValue(combo.description, combo.effect);
  return `
    <article class="cast-v2-combo-card">
      <header><h3>${escapeHtml(combo.name || "名称未登録")}</h3><span>${counter ? "COUNTER" : "COMBO"}</span></header>
      ${skills ? `<p class="cast-v2-combo-card__skills">${escapeHtml(skills)}</p>` : ""}
      <div class="cast-v2-meta-chips">${meta.map(value => `<span>${escapeHtml(value)}</span>`).join("")}</div>
      ${description ? `<p>${escapeHtml(description)}</p>` : ""}
    </article>
  `;
}

function empty(message) {
  return `<p class="cast-v2-empty">${escapeHtml(message)}</p>`;
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function valueOrDash(value) {
  return hasValue(value) ? String(value) : "—";
}
