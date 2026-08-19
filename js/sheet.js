import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";
import { SITE_BASE_PATH } from "./config.js?v=2";
import { createSheetSaveCoordinator } from "./sheet-save-coordinator.js?v=1";
import { persistSheetBundle } from "./sheet-save-persistence.js?v=1";
import { loadSheetBundle } from "./sheet-load-persistence.js?v=1";
import { buildCharacterSavePayload, buildSkillSavePayloads, buildOutfitSavePayloads } from "./sheet-save-payload.js?v=1";
import {
  STYLE_SEPARATOR_MARKER,
  isStyleSeparatorRecord as isStyleSeparator,
  normalizeLoadedSkill,
  normalizeLoadedOutfit
} from "./sheet-load-normalization.js?v=1";
import { formatSheetPersistenceError } from "./sheet-error-message.js?v=1";
import { initSheetRowInteractions } from "./sheet-row-interactions.js?v=1";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[char]));

const SUITS = ["reason", "passion", "life", "mundane"];
const MARKS = ["♠", "♣", "♥", "♦"];
const ABILITIES = [
  ["reason", "理性", "REASON"],
  ["passion", "感情", "PASSION"],
  ["life", "生命", "LIFE"],
  ["mundane", "外界", "MUNDANE"]
];
const GENERAL_MASTER = [
  ["医療", "reason", "general"], ["射撃", "reason", "general"], ["知覚", "reason", "general"], ["電脳", "reason", "general"], ["製作：", "reason", "proper"],
  ["心理", "passion", "general"], ["自我", "passion", "general"], ["交渉", "passion", "general"], ["芸術：", "passion", "proper"],
  ["運動", "life", "general"], ["回避", "life", "general"], ["白兵", "life", "general"], ["操縦：", "life", "proper"],
  ["信用", "mundane", "general"], ["圧力", "mundane", "general"], ["隠密", "mundane", "general"]
];
const GENERAL_BLANK_SLOT_COLUMNS = ["left", "left", "right", "right"];
const OUTFIT_LABELS = {
  weapon: "武器",
  armor: "防具",
  cyberware: "サイバーウェア",
  tron: "トロン",
  vehicle: "ヴィークル",
  residence: "住居",
  other: "その他"
};
const STRUCTURED_FIELDS = [
  ["handle_kana", "#handle-kana"], ["age", "#age"], ["gender", "#gender"],
  ["height", "#height"], ["weight", "#weight"], ["eyes", "#eyes"], ["hair", "#hair"],
  ["skin", "#skin"], ["life_path_origin", "#life-path-origin"],
  ["life_path_experience", "#life-path-experience"], ["life_path_encounter", "#life-path-encounter"]
];

let user;
let character = null;
let skills = [];
let outfits = [];
let loading = false;
let importMode = "";
const styleBaseline = {};

const saveCoordinator = createSheetSaveCoordinator({
  validate() {
    if (!$("#character-name")?.value.trim() || !$("#player-name")?.value.trim()) return "キャスト名とプレイヤー名を入力してください。";
    return "";
  },
  async persist() {
    const data = await persistSheetBundle({
      characterId: character?.id ?? null,
      character: collectCharacter(),
      skills: collectSkills(),
      outfits: collectOutfits()
    });
    character = data;
    history.replaceState(null, "", `${SITE_BASE_PATH}sheet.html?id=${encodeURIComponent(character.public_id)}`);
    window.dispatchEvent(new CustomEvent("tnx:character-saved", { detail: { id: character.id, publicId: character.public_id } }));
    return data;
  },
  onError(error) {
    return formatSheetPersistenceError(error?.message, { operation: "save" });
  }
});

init();

async function init() {
  user = await requireAuth();
  if (!user) return;
  renderStyles();
  renderAbilities();
  bind();
  const id = new URLSearchParams(location.search).get("id");
  if (id) await loadCharacter(id); else createNew();
}

function bind() {
  document.addEventListener("input", onEdit);
  document.addEventListener("change", onEdit);
  window.addEventListener("beforeunload", event => {
    if (!saveCoordinator.hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  });
  document.addEventListener("click", event => {
    const toggle = event.target.closest(".section-toggle");
    if (toggle) toggle.closest(".sheet-section")?.classList.toggle("is-open");
  });

  initSheetRowInteractions({
    root: document,
    onSkillInput: handleSkillRowInput,
    onOutfitInput: handleOutfitRowInput,
    onDeleteSkill: deleteSkillByKey,
    onMoveSkill: moveSkillByKey,
    onDeleteOutfit: deleteOutfitByKey
  });

  $("#save-button").onclick = () => saveCoordinator.save(true);
  $("#add-general").onclick = addGeneralSkill;
  $("#add-social").onclick = () => addSkill("social", "proper", "社会：");
  $("#add-connection").onclick = () => addSkill("connection", "proper", "コネ：");
  $("#add-style-skill").onclick = () => addSkill("style", "normal", "");
  $("#add-outfit").onclick = () => { outfits.push(blankOutfit()); renderOutfits(); markDirty(); };
  $("#import-skd").onclick = () => openImport("skd");
  $("#import-ofc").onclick = () => openImport("ofc");
  $("#tsv-apply").onclick = event => { event.preventDefault(); applyImport(); $("#tsv-dialog").close(); };
}

function onEdit(event) {
  if (loading || !event.target.matches("input,select,textarea")) return;
  recalc(); markDirty();
}

function handleSkillRowInput({ key, field, value, element, row }) {
  const skill = skills.find(item => item._key === key); if (!skill) return;
  skill[field] = value;
  if (SUITS.includes(field)) {
    const suitCount = SUITS.filter(suit => skill[suit]).length;
    skill.level = Math.max(Number(skill.level || 0), suitCount);
    const levelInput = row.querySelector('[data-f="level"]'); if (levelInput) levelInput.value = String(skill.level);
  } else if (field === "level") {
    const level = Math.max(0, Number(value || 0));
    skill.level = level; skill.free_level = Math.min(Math.max(Number(skill.free_level || 0), 0), level); element.value = String(level);
  }
  recalc(); markDirty();
}

function handleOutfitRowInput({ key, field, value }) {
  const outfit = outfits.find(item => item._key === key); if (!outfit) return;
  outfit[field] = value;
  if (field === "category") renderOutfits();
  recalc(); markDirty();
}

function deleteSkillByKey(key) {
  skills = skills.filter(item => item._key !== key);
  renderSkills(); recalc(); markDirty();
}

function moveSkillByKey(key, direction) {
  const index = skills.findIndex(item => item._key === key);
  if (index < 0) return;
  const category = skills[index].category;
  const step = direction === "up" ? -1 : 1;
  let other = index + step;
  while (other >= 0 && other < skills.length && skills[other].category !== category) other += step;
  if (other < 0 || other >= skills.length) return;
  [skills[index], skills[other]] = [skills[other], skills[index]];
  renderSkills(); recalc(); markDirty();
}

function deleteOutfitByKey(key) {
  outfits = outfits.filter(item => item._key !== key);
  renderOutfits(); recalc(); markDirty();
}

function addSkill(category, kind, name) {
  skills.push({ ...blankSkill(category), skill_kind: kind, name });
  renderSkills(); recalc(); markDirty();
}

function addStyleSeparator() {
  const skill = {
    ...blankSkill("style"),
    name: "",
    level: 1,
    free_level: 0,
    skill_kind: "none",
    description: STYLE_SEPARATOR_MARKER,
    _rowType: "separator"
  };
  skills.push(skill);
  renderSkills(); recalc(); markDirty();
  requestAnimationFrame(() => document.querySelector(`#style-skills tr[data-skill-key="${skill._key}"] [data-f="name"]`)?.focus());
}

window.TNXSheetEditor = { ...(window.TNXSheetEditor || {}), addStyleSeparator };

function generalColumnCounts() {
  const leftRows = document.querySelectorAll("#general-skills .general-skill-column--first tbody tr").length;
  const rightRows = document.querySelectorAll("#general-skills .general-skill-column--second tbody tr").length;
  if (leftRows || rightRows) return { left: leftRows, right: rightRows };
  return skills.filter(item => item.category === "general" && item._slotColumn).reduce((counts, item) => {
    counts[item._slotColumn === "left" ? "left" : "right"] += 1;
    return counts;
  }, { left: 0, right: 0 });
}

function addGeneralSkill() {
  const counts = generalColumnCounts();
  const column = counts.left <= counts.right ? "left" : "right";
  const skill = { ...blankSkill("general"), name: "", level: 0, free_level: 0, skill_kind: "proper", _blankSlot: true, _slotColumn: column };
  skills.push(skill); renderSkills(); recalc(); markDirty();
  requestAnimationFrame(() => document.querySelector(`#general-skills tr[data-skill-key="${skill._key}"] [data-f="name"]`)?.focus());
}

function createNew() {
  loading = true;
  character = { visibility: "private" };
  $("#visibility").value = "private";
  skills = GENERAL_MASTER.filter(item => item[2] === "general").map(([name, suit]) => ({
    ...blankSkill("general"), name, level: 1, free_level: 0, [suit]: true, skill_kind: "general"
  }));
  ensureGeneralMasterRows();
  addInitialGeneralBlankSlots();
  skills.push(
    { ...blankSkill("social"), name: "社会：N◎VA", level: 1, free_level: 0, skill_kind: "proper" },
    { ...blankSkill("social"), name: "社会：", level: 1, free_level: 0, skill_kind: "proper" },
    { ...blankSkill("social"), name: "社会：", level: 1, free_level: 0, skill_kind: "proper" },
    { ...blankSkill("social"), name: "社会：", level: 1, free_level: 0, skill_kind: "proper" },
    { ...blankSkill("connection"), name: "コネ：", level: 1, free_level: 0, skill_kind: "proper" },
    { ...blankSkill("connection"), name: "コネ：", level: 1, free_level: 0, skill_kind: "proper" },
    { ...blankSkill("connection"), name: "コネ：", level: 1, free_level: 0, skill_kind: "proper" }
  );
  renderSkills(); renderOutfits(); recalc();
  loading = false;
  saveCoordinator.markDirty();
}

async function loadCharacter(publicId) {
  loading = true;
  saveCoordinator.markLoading("読込中…");
  try {
    const bundle = await loadSheetBundle({ publicId, ownerId: user.id });
    character = bundle.character; fillCharacter(character);
    skills = bundle.skills.map(skill => normalizeLoadedSkill(skill, {
      styleKindFromLabel: label => window.TNXStyleSkillKinds?.fromLabel(label)
    }));
    ensureGeneralMasterRows(); addInitialGeneralBlankSlots();
    outfits = bundle.outfits.map(normalizeLoadedOutfit);
    renderSkills(); renderOutfits(); recalc();
    saveCoordinator.markSaved();
  } catch (error) {
    console.error(error); character = null; skills = []; outfits = [];
    renderSkills(); renderOutfits();
    const detail = formatSheetPersistenceError(error?.message, { operation: "load" });
    saveCoordinator.markLoadError(`${detail} 保存は行われません。`);
  } finally { loading = false; }
}

function fillCharacter(data) {
  ["character_name", "character_kana", "handle", "player_name", "affiliation", "citizen_rank", "summary", "profile"].forEach(name => {
    const element = $("#" + name.replaceAll("_", "-")); if (element) element.value = data[name] ?? "";
  });
  for (const [name, selector] of STRUCTURED_FIELDS) { const element = $(selector); if (element) element.value = data[name] ?? ""; }
  $("#visibility").value = data.visibility === "public" ? "public" : "private";
  for (let i = 1; i <= 3; i++) {
    $(`#style-${i}`).value = data[`style_${i}`] || "";
    $(`#style-${i}-mark`).value = data[`style_${i}_mark`] || "";
    const attribute = $(`#style-${i}-attribute`); if (attribute) attribute.value = data[`style_${i}_attribute`] || "";
    toggleAttribute(i);
  }
  calculateBaselines();
  for (const [key] of ABILITIES) {
    $(`#${key}-base`).value = Number(data[`${key}_base`] ?? data[`${key}_value`] ?? styleBaseline[key] ?? 0);
    $(`#${key}-mod`).value = Number(data[`${key}_gear`] || 0) + Number(data[`${key}_manual`] || 0);
    const controlKey = `${key}-control`;
    $(`#${controlKey}-base`).value = Number(data[`${key}_control_base`] ?? data[`${key}_control`] ?? styleBaseline[controlKey] ?? 0);
    $(`#${controlKey}-mod`).value = Number(data[`${key}_control_gear`] || 0) + Number(data[`${key}_control_manual`] || 0);
  }
  $("#cs-base").value = data.cs_base ?? data.cs ?? 0;
  $("#cs-mod").value = Number(data.cs_gear || 0) + Number(data.cs_manual || 0);
  updateDivines(false);
}

function renderStyles() {
  const options = '<option value="">選択</option>' + STYLE_DATA.map(item => `<option>${esc(item.name)}</option>`).join("");
  const attributes = '<option value="">属性を選択</option>' + UTSUWA_ATTRIBUTES.map(item => `<option>${esc(item.name)}</option>`).join("");
  $("#style-grid").innerHTML = [1, 2, 3].map(i => `
    <article class="style-card"><div class="style-fields">
      <label>スタイル<select id="style-${i}">${options}</select></label>
      <label>指定<select id="style-${i}-mark"><option value="">無印</option><option>◎</option><option>●</option><option>◎●</option></select></label>
      <label id="style-${i}-attribute-wrap" hidden>ウツワ属性<select id="style-${i}-attribute">${attributes}</select></label>
    </div><section class="divine-field"><ruby><strong id="divine-${i}">未選択</strong><rt id="divine-${i}-yomi"></rt></ruby><span>神業</span></section></article>`).join("");
  $("#style-grid").addEventListener("change", event => {
    if (!event.target.matches('[id^="style-"]')) return;
    for (let i = 1; i <= 3; i++) toggleAttribute(i);
    updateDivines(true);
  });
}

function toggleAttribute(i) {
  const wrap = $(`#style-${i}-attribute-wrap`), select = $(`#style-${i}-attribute`);
  if (!wrap || !select) return;
  const enabled = $(`#style-${i}`).value === "ウツワ";
  wrap.hidden = !enabled; if (!enabled) select.value = "";
}

function styleRecord(i) {
  const name = $(`#style-${i}`).value;
  return name === "ウツワ" ? UTSUWA_ATTRIBUTES.find(item => item.name === $(`#style-${i}-attribute`).value) || null : STYLE_DATA.find(item => item.name === name) || null;
}

function calculateBaselines() {
  for (const [key] of ABILITIES) { styleBaseline[key] = 0; styleBaseline[`${key}-control`] = 0; }
  for (let i = 1; i <= 3; i++) {
    const record = styleRecord(i); if (!record) continue;
    for (const [key] of ABILITIES) {
      styleBaseline[key] += Number(record[key]?.[0] || 0);
      styleBaseline[`${key}-control`] += Number(record[key]?.[1] || 0);
    }
  }
}

function updateDivines(apply) {
  for (let i = 1; i <= 3; i++) {
    const style = STYLE_DATA.find(item => item.name === $(`#style-${i}`).value);
    $(`#divine-${i}`).textContent = style?.divine || "未選択";
    $(`#divine-${i}-yomi`).textContent = style?.divineYomi || style?.divine || "";
  }
  $("#style-warning").textContent = [1, 2, 3].filter(i => $(`#style-${i}`).value).length === 3 ? "" : "3枠すべてのスタイルを選択してください。";
  if (!apply || loading) return;
  const old = { ...styleBaseline }; calculateBaselines();
  for (const [key] of ABILITIES) {
    adjustBaseline(key, old[key] || 0, styleBaseline[key] || 0);
    adjustBaseline(`${key}-control`, old[`${key}-control`] || 0, styleBaseline[`${key}-control`] || 0);
  }
  recalc();
}

function adjustBaseline(id, oldBase, newBase) {
  const element = $(`#${id}-base`);
  if (element && (Number(element.value || 0) === oldBase || Number(element.value || 0) === 0)) element.value = newBase;
}

function renderAbilities() {
  $("#ability-grid").innerHTML = ABILITIES.map(([key, jp, en]) => `
    <article class="ability-card ability-matrix"><h3>${jp} <small>${en}</small></h3>
      <div class="ability-matrix__header"><span></span><strong>能力値</strong><strong>制御値</strong></div>
      <div class="ability-matrix__row"><span>現在値</span><input id="${key}-base" type="number" min="0" value="0"><input id="${key}-control-base" type="number" min="0" value="0"></div>
      <div class="ability-matrix__row"><span>補正値</span><input id="${key}-mod" type="number" value="0"><input id="${key}-control-mod" type="number" value="0"></div>
      <div class="ability-matrix__row ability-matrix__result"><span>最終値</span><strong id="${key}-final">0</strong><strong id="${key}-control-final">0</strong></div>
    </article>`).join("") + `
    <article class="ability-card ability-card--cs"><h3>CS</h3><div class="cs-row"><label>現在値<input id="cs-base" type="number" value="0"></label><label>補正値<input id="cs-mod" type="number" value="0"></label><strong id="cs-final">0</strong></div></article>`;
}

function blankSkill(category) {
  return {
    _key: crypto.randomUUID(), category, name: "", level: 1, free_level: 0,
    skill_kind: category === "style" ? "normal" : category === "general" ? "general" : "proper",
    reason: false, passion: false, life: false, mundane: false,
    timing: "", target: "", range: "", difficulty: "", confrontation: "", description: "", sort_order: skills.length
  };
}

function ensureGeneralMasterRows() {
  for (const [name, , kind] of GENERAL_MASTER) {
    const matches = skills.filter(item => item.category === "general" && item.name === name);
    let skill = matches.sort((a, b) => {
      const levelDiff = Number(b.level || 0) - Number(a.level || 0); if (levelDiff) return levelDiff;
      return SUITS.filter(suit => b[suit]).length - SUITS.filter(suit => a[suit]).length;
    })[0];
    if (skill) {
      for (const duplicate of matches) {
        if (duplicate === skill) continue;
        SUITS.forEach(suit => { skill[suit] = Boolean(skill[suit] || duplicate[suit]); });
        skill.level = Math.max(Number(skill.level || 0), Number(duplicate.level || 0));
        skill.free_level = Math.max(Number(skill.free_level || 0), Number(duplicate.free_level || 0));
      }
      skill.level = Math.max(Number(skill.level || 0), SUITS.filter(suit => skill[suit]).length);
      skill.free_level = Math.min(Math.max(Number(skill.free_level || 0), 0), skill.level);
      skills = skills.filter(item => item === skill || item.category !== "general" || item.name !== name);
    } else { skill = { ...blankSkill("general"), name, level: 0, free_level: 0, skill_kind: kind }; skills.push(skill); }
    skill._fixedMaster = true;
  }
}

function addInitialGeneralBlankSlots() {
  for (const column of GENERAL_BLANK_SLOT_COLUMNS) skills.push({ ...blankSkill("general"), name: "", level: 0, free_level: 0, skill_kind: "proper", _blankSlot: true, _slotColumn: column });
}

function mergedGeneral() {
  const output = skills.filter(item => item.category === "general");
  return output.sort((a, b) => {
    const ai = GENERAL_MASTER.findIndex(item => item[0] === a.name), bi = GENERAL_MASTER.findIndex(item => item[0] === b.name);
    if (ai < 0 && bi < 0) return 0; if (ai < 0) return 1; if (bi < 0) return -1; return ai - bi;
  });
}

function renderSkills() {
  const general = mergedGeneral();
  const splitIndex = general.findIndex(item => item.name === "交渉") + 1;
  const firstGeneral = splitIndex > 0 ? general.slice(0, splitIndex) : general;
  const secondGeneral = splitIndex > 0 ? general.slice(splitIndex) : [];
  $("#general-skills").innerHTML = `
    <div class="general-skill-columns">${skillTable("一般技能", "GENERAL SKILLS", firstGeneral, false, "general general-skill-column general-skill-column--first")}${skillTable("一般技能", "GENERAL SKILLS", secondGeneral, false, "general general-skill-column general-skill-column--second")}</div>
    ${skillTable("社会", "SOCIAL", skills.filter(item => item.category === "social"), false, "social skill-group--ordered")}
    ${skillTable("コネクション", "CONNECTIONS", skills.filter(item => item.category === "connection"), false, "connection skill-group--ordered")}`;
  $("#style-skills").innerHTML = skillTable("スタイル技能", "STYLE SKILLS", skills.filter(item => item.category === "style"), true, "style");
}

function skillTable(jp, en, rows, detail, category = "") {
  if (!rows.length && !category.startsWith("general")) return "";
  return `<section class="skill-group ${esc(category)}" data-skill-category="${esc(category.split(" ")[0])}"><h3 class="skill-group-title">${jp} <small>${en}</small></h3>
    <table class="skill-table ${detail ? "has-detail" : "no-detail"}"><thead><tr><th class="name-col">名称</th><th class="type-col">種別</th><th class="lv-col">LV</th>${MARKS.map(mark => `<th class="suit-col">${mark}</th>`).join("")}${detail ? "<th>詳細</th>" : ""}<th></th></tr></thead><tbody>${rows.map(item => skillRow(item, detail)).join("")}</tbody></table></section>`;
}

function rowActions(skill, ordered) {
  const categoryRows = ordered ? skills.filter(item => item.category === skill.category) : [];
  const categoryIndex = ordered ? categoryRows.findIndex(item => item._key === skill._key) : -1;
  return `<div class="row-actions skill-row-actions">${ordered ? `<button class="row-action row-action--up" data-action="move-up" data-skill-move="up" data-skill-key="${skill._key}" type="button" aria-label="上へ移動" ${categoryIndex === 0 ? "disabled" : ""}>▲</button><button class="row-action row-action--down" data-action="move-down" data-skill-move="down" data-skill-key="${skill._key}" type="button" aria-label="下へ移動" ${categoryIndex === categoryRows.length - 1 ? "disabled" : ""}>▼</button>` : ""}<button class="row-action row-action--delete" data-action="delete" data-delete-skill="${skill._key}" type="button" aria-label="削除">×</button></div>`;
}

function styleSeparatorRow(skill) {
  return `<tr class="style-skill-separator-row" data-style-separator="1" data-style-separator-structure="2cell" data-skill-key="${skill._key}">
    <td class="style-separator-main"><textarea data-f="name" rows="1" placeholder="スタイル名を入力（例：アヤカシ）" aria-label="スタイル技能の区切り名">${esc(skill.name)}</textarea></td>
    <td class="style-separator-actions">${rowActions(skill, true)}</td>
  </tr>`;
}

function skillRow(skill, detail) {
  if (isStyleSeparator(skill)) return styleSeparatorRow(skill);
  let kinds;
  if (skill.category === "style") kinds = ["none", "normal", "secret", "ultimate", "direction"];
  else if (skill.category === "general") kinds = ["general", "proper"];
  else kinds = ["proper"];
  const labels = { general: "一般", proper: "固有名詞", none: "なし", normal: "通常", secret: "秘技", ultimate: "奥義", direction: "演出", ...(window.TNXStyleSkillKinds?.labels || {}) };
  const slotAttribute = skill._blankSlot ? ` data-general-slot-column="${esc(skill._slotColumn || "right")}"` : "";
  const ordered = skill.category === "social" || skill.category === "connection" || skill.category === "style";
  const nameControl = skill.category === "style"
    ? `<textarea data-f="name" rows="1" aria-label="名称">${esc(skill.name)}</textarea>`
    : `<input data-f="name" value="${esc(skill.name)}">`;
  return `<tr data-skill-key="${skill._key}"${slotAttribute}>
    <td>${nameControl}</td>
    <td><select data-f="skill_kind">${kinds.map(value => `<option value="${value}" ${skill.skill_kind === value ? "selected" : ""}>${labels[value]}</option>`).join("")}</select></td>
    <td><input data-f="level" type="number" min="0" value="${Number(skill.level) || 0}"></td>
    ${SUITS.map((suit, index) => `<td class="suit-cell"><label class="suit-check"><input data-f="${suit}" type="checkbox" ${skill[suit] ? "checked" : ""}><span>${MARKS[index]}</span></label></td>`).join("")}
    ${detail ? `<td><textarea data-f="description" rows="2">${esc(skill.description || skill.timing || "")}</textarea></td>` : ""}
    <td>${rowActions(skill, ordered)}</td>
  </tr>`;
}

function blankOutfit() {
  return { _key: crypto.randomUUID(), category: "other", name: "", purchase_value: "", experience_cost: 0, concealment: "", attack: "", range: "", slot: "", description: "", sort_order: outfits.length };
}

function outfitFields(outfit) {
  const common = `<label>名称<input data-o="name" value="${esc(outfit.name)}"></label><label>購入<input data-o="purchase_value" value="${esc(outfit.purchase_value)}"></label><label>常備化<input data-o="experience_cost" type="number" value="${Number(outfit.experience_cost || 0)}"></label>`;
  const description = `<label class="outfit-description">解説<input data-o="description" value="${esc(outfit.description)}"></label>`;
  if (outfit.category === "weapon") return common + `<label>隠匿<input data-o="concealment" value="${esc(outfit.concealment)}"></label><label>攻撃<input data-o="attack" value="${esc(outfit.attack)}"></label><label>射程<input data-o="range" value="${esc(outfit.range)}"></label><label>部位<input data-o="slot" value="${esc(outfit.slot)}"></label>` + description;
  if (outfit.category === "armor") return common + `<label>隠匿<input data-o="concealment" value="${esc(outfit.concealment)}"></label><label>部位<input data-o="slot" value="${esc(outfit.slot)}"></label><label>制御値<input data-o="control_modifier" type="number" value="${Number(outfit.control_modifier || 0)}"></label>` + description;
  if (outfit.category === "tron") return common + `<label>隠匿<input data-o="concealment" value="${esc(outfit.concealment)}"></label><label>部位<input data-o="slot" value="${esc(outfit.slot)}"></label><label>CS修正<input data-o="cs_modifier" type="number" value="${Number(outfit.cs_modifier || 0)}"></label>` + description;
  if (outfit.category === "vehicle") return common + `<label>攻撃<input data-o="attack" value="${esc(outfit.attack)}"></label><label>制御値<input data-o="control_modifier" type="number" value="${Number(outfit.control_modifier || 0)}"></label><label>CS修正<input data-o="cs_modifier" type="number" value="${Number(outfit.cs_modifier || 0)}"></label>` + description;
  if (outfit.category === "residence") return common + `<label>部位／エリア<input data-o="slot" value="${esc(outfit.slot)}"></label>` + description;
  return common + `<label>隠匿<input data-o="concealment" value="${esc(outfit.concealment)}"></label><label>部位<input data-o="slot" value="${esc(outfit.slot)}"></label>` + description;
}

function renderOutfits() {
  $("#outfit-list").innerHTML = outfits.map(outfit => `<article class="outfit-card outfit-form" data-outfit-key="${outfit._key}"><header><label>分類<select data-o="category">${Object.entries(OUTFIT_LABELS).map(([value, label]) => `<option value="${value}" ${outfit.category === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><button class="row-delete" data-delete-outfit="${outfit._key}" type="button">×</button></header><div class="outfit-fields">${outfitFields(outfit)}</div></article>`).join("") || "<p>アウトフィット未登録</p>";
}

function current(id) { return Number($(`#${id}-base`)?.value || 0); }
function final(id) { return current(id) + Number($(`#${id}-mod`)?.value || 0); }
function recalc() {
  for (const [key] of ABILITIES) { $(`#${key}-final`).textContent = final(key); $(`#${key}-control-final`).textContent = final(`${key}-control`); }
  $("#cs-final").textContent = Number($("#cs-base").value || 0) + Number($("#cs-mod").value || 0);
  window.TNXExperience?.queue?.();
}
function markDirty() { if (loading) return; saveCoordinator.markDirty(); }

function collectCharacter() {
  const experience = window.TNXExperience?.calculate?.();
  const structured = Object.fromEntries(STRUCTURED_FIELDS.map(([name, selector]) => [name, $(selector)?.value || ""]));
  const styles = [1, 2, 3].map(i => {
    const name = $(`#style-${i}`).value;
    const style = STYLE_DATA.find(item => item.name === name);
    return {
      name,
      mark: $(`#style-${i}-mark`).value,
      attribute: $(`#style-${i}-attribute`)?.value || "",
      divine: style?.divine || "",
      divineYomi: style?.divineYomi || style?.divine || ""
    };
  });
  const abilities = Object.fromEntries(ABILITIES.map(([key]) => {
    const controlKey = `${key}-control`;
    return [key, {
      current: current(key),
      baseline: Number(styleBaseline[key] || 0),
      modifier: Number($(`#${key}-mod`).value || 0),
      controlCurrent: current(controlKey),
      controlBaseline: Number(styleBaseline[controlKey] || 0),
      controlModifier: Number($(`#${controlKey}-mod`).value || 0)
    }];
  }));
  return buildCharacterSavePayload({
    base: {
      character_name: $("#character-name").value,
      character_kana: $("#character-kana").value,
      handle: $("#handle").value,
      player_name: $("#player-name").value,
      affiliation: $("#affiliation").value,
      citizen_rank: $("#citizen-rank").value,
      summary: $("#summary").value,
      profile: $("#profile").value,
      visibility: $("#visibility").value,
      experience_points: Number(experience?.total ?? $("#exp-total").textContent ?? 0)
    },
    structured,
    styles,
    abilities,
    cs: {
      base: Number($("#cs-base").value || 0),
      modifier: Number($("#cs-mod").value || 0)
    }
  });
}

function collectSkills() {
  return buildSkillSavePayloads(skills, { isStyleSeparator, styleSeparatorMarker: STYLE_SEPARATOR_MARKER });
}

function collectOutfits() {
  return buildOutfitSavePayloads(outfits);
}

function openImport(mode) { importMode = mode; $("#tsv-title").textContent = `${mode.toUpperCase()} TSV取込`; $("#tsv-text").value = ""; $("#tsv-dialog").showModal(); }

function parseTSV(text) {
  const lines = String(text).replace(/\r/g, "").trim().split("\n").filter(Boolean).map(line => line.split("\t"));
  if (!lines.length) return [];
  const header = lines.shift().map(value => value.trim());
  return lines.map(row => Object.fromEntries(header.map((name, index) => [name, (row[index] || "").replace(/\\n/g, "\n")])));
}

function applyImport() {
  const rows = parseTSV($("#tsv-text").value);
  if (importMode === "skd") {
    for (const row of rows) skills.push({ ...blankSkill("style"), name: row["名称"] || "", skill_kind: window.TNXStyleSkillKinds?.fromLabel(row["種別"]) || (/奥義/.test(row["種別"] || "") ? "ultimate" : /秘技/.test(row["種別"] || "") ? "secret" : "normal"), level: Number(row["レベル"] || 1), description: row["解説"] || "" });
    renderSkills();
  } else {
    const map = { weapons: "weapon", armours: "armor", vehicles: "vehicle", residences: "residence", outfits: "other", 武器: "weapon", 防具: "armor", ヴィークル: "vehicle", 住居: "residence", 住宅: "residence", 装備: "other" };
    for (const row of rows) outfits.push({ ...blankOutfit(), category: map[row.target] || "other", name: row.name || "", purchase_value: row.purchase || "", experience_cost: Number(row.permanent || 0), concealment: [row.concealA, row.concealB].filter(Boolean).join("/"), attack: row.attack || "", range: row.range || "", slot: row.part || row.slot || "", description: row.notes || "" });
    renderOutfits();
  }
  recalc(); markDirty();
}
