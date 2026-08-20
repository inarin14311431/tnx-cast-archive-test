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
import { renderSkillEditorSections } from "./sheet-skill-renderer.js?v=1";
import { renderOutfitEditor } from "./sheet-outfit-renderer.js?v=1";
import { createBlankSkill, createBlankOutfit } from "./sheet-row-factory.js?v=1";
import {
  reconcileGeneralMasterRows,
  appendGeneralBlankSlots,
  orderGeneralRows
} from "./sheet-general-skill-state.js?v=1";
import {
  parseSheetTsv,
  buildStyleSkillTsvRow,
  buildOutfitTsvRow
} from "./sheet-tsv-import.js?v=1";
import { renderStyleCards, renderAbilityCards } from "./sheet-character-renderer.js?v=1";
import { calculateStyleBaselines } from "./sheet-style-baseline.js?v=1";
import { buildStylePresentation } from "./sheet-style-presentation.js?v=1";
import { calculateAbilityFinals } from "./sheet-ability-calculation.js?v=1";
import { resolveStyleBaselineValue } from "./sheet-baseline-adjustment.js?v=1";
import { buildNewCharacterSkills } from "./sheet-new-character-state.js?v=1";
import { chooseGeneralSkillColumn } from "./sheet-general-column.js?v=1";
import { resolveSkillInputState } from "./sheet-skill-level-suit-state.js?v=1";
import { buildStyleSaveRows } from "./sheet-style-save-projection.js?v=1";
import { buildAbilitySaveSnapshot, buildCsSaveSnapshot } from "./sheet-ability-save-projection.js?v=1";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const SUITS = ["reason", "passion", "life", "mundane"];
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

function handleSkillRowInput({ key, field, value, row }) {
  const skill = skills.find(item => item._key === key); if (!skill) return;
  const currentLevel = skill.level;
  const currentFreeLevel = skill.free_level;
  skill[field] = value;

  let state = null;
  if (SUITS.includes(field)) {
    state = resolveSkillInputState({
      action: "suit",
      currentLevel,
      currentFreeLevel,
      selectedSuitCount: SUITS.filter(suit => skill[suit]).length,
      checked: Boolean(value)
    });
  } else if (field === "level" || field === "free_level") {
    state = resolveSkillInputState({
      action: field,
      value,
      currentLevel,
      currentFreeLevel
    });
  }

  if (state) {
    skill.level = state.level;
    skill.free_level = state.freeLevel;
    const levelInput = row.querySelector('[data-f="level"]');
    const freeLevelInput = row.querySelector('[data-f="free_level"]');
    if (levelInput) levelInput.value = String(state.level);
    if (freeLevelInput) freeLevelInput.value = String(state.freeLevel);
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
  const column = chooseGeneralSkillColumn(counts);
  const skill = { ...blankSkill("general"), name: "", level: 0, free_level: 0, skill_kind: "proper", _blankSlot: true, _slotColumn: column };
  skills.push(skill); renderSkills(); recalc(); markDirty();
  requestAnimationFrame(() => document.querySelector(`#general-skills tr[data-skill-key="${skill._key}"] [data-f="name"]`)?.focus());
}

function createNew() {
  loading = true;
  character = { visibility: "private" };
  $("#visibility").value = "private";
  skills = buildNewCharacterSkills({
    masterRows: GENERAL_MASTER,
    suits: SUITS,
    blankColumns: GENERAL_BLANK_SLOT_COLUMNS,
    createBlankSkill
  });
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
    $(`#${controlKey}-mod`).value = Number(data[`${controlKey.replace("-control", "")}_control_gear`] || 0) + Number(data[`${controlKey.replace("-control", "")}_control_manual`] || 0);
  }
  $("#cs-base").value = data.cs_base ?? data.cs ?? 0;
  $("#cs-mod").value = Number(data.cs_gear || 0) + Number(data.cs_manual || 0);
  updateDivines(false);
}

function renderStyles() {
  $("#style-grid").innerHTML = renderStyleCards({ styleData: STYLE_DATA, utsuwaAttributes: UTSUWA_ATTRIBUTES });
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

function currentStyleSlots() {
  return [1, 2, 3].map(i => ({
    name: $(`#style-${i}`).value,
    mark: $(`#style-${i}-mark`).value,
    attribute: $(`#style-${i}-attribute`)?.value || ""
  }));
}

function calculateBaselines() {
  const calculated = calculateStyleBaselines({
    slots: currentStyleSlots(),
    abilities: ABILITIES,
    styleData: STYLE_DATA,
    utsuwaAttributes: UTSUWA_ATTRIBUTES
  });
  for (const [key] of ABILITIES) {
    styleBaseline[key] = Number(calculated[key] || 0);
    styleBaseline[`${key}-control`] = Number(calculated[`${key}-control`] || 0);
  }
}

function updateDivines(apply) {
  const presentation = buildStylePresentation({
    slots: currentStyleSlots(),
    styleData: STYLE_DATA
  });
  presentation.divines.forEach((divine, index) => {
    const i = index + 1;
    $(`#divine-${i}`).textContent = divine.name;
    $(`#divine-${i}-yomi`).textContent = divine.yomi;
  });
  $("#style-warning").textContent = presentation.warning;
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
  if (!element) return;
  element.value = String(resolveStyleBaselineValue(element.value, oldBase, newBase));
}

function renderAbilities() {
  $("#ability-grid").innerHTML = renderAbilityCards(ABILITIES);
}

function blankSkill(category) {
  return createBlankSkill(category, { sortOrder: skills.length });
}

function ensureGeneralMasterRows() {
  skills = reconcileGeneralMasterRows(skills, {
    masterRows: GENERAL_MASTER,
    suits: SUITS,
    createBlankSkill
  });
}

function addInitialGeneralBlankSlots() {
  skills = appendGeneralBlankSlots(skills, {
    columns: GENERAL_BLANK_SLOT_COLUMNS,
    createBlankSkill
  });
}

function mergedGeneral() {
  return orderGeneralRows(skills, GENERAL_MASTER);
}

function renderSkills() {
  const rendered = renderSkillEditorSections({
    generalRows: mergedGeneral(),
    socialRows: skills.filter(item => item.category === "social"),
    connectionRows: skills.filter(item => item.category === "connection"),
    styleRows: skills.filter(item => item.category === "style"),
    isStyleSeparator,
    styleKindLabels: window.TNXStyleSkillKinds?.labels || {}
  });
  $("#general-skills").innerHTML = rendered.generalHtml;
  $("#style-skills").innerHTML = rendered.styleHtml;
}

function blankOutfit() {
  return createBlankOutfit({ sortOrder: outfits.length });
}

function renderOutfits() {
  $("#outfit-list").innerHTML = renderOutfitEditor(outfits);
}

function current(id) { return Number($(`#${id}-base`)?.value || 0); }
function currentAbilityValues() {
  return Object.fromEntries(ABILITIES.map(([key]) => {
    const controlKey = `${key}-control`;
    return [key, {
      current: current(key),
      modifier: Number($(`#${key}-mod`)?.value || 0),
      controlCurrent: current(controlKey),
      controlModifier: Number($(`#${controlKey}-mod`)?.value || 0)
    }];
  }));
}
function recalc() {
  const finals = calculateAbilityFinals({
    abilities: ABILITIES,
    values: currentAbilityValues(),
    cs: {
      current: Number($("#cs-base")?.value || 0),
      modifier: Number($("#cs-mod")?.value || 0)
    }
  });
  for (const [key] of ABILITIES) {
    $(`#${key}-final`).textContent = finals[key];
    $(`#${key}-control-final`).textContent = finals[`${key}-control`];
  }
  $("#cs-final").textContent = finals.cs;
  window.TNXExperience?.queue?.();
}
function markDirty() { if (loading) return; saveCoordinator.markDirty(); }

function collectCharacter() {
  const experience = window.TNXExperience?.calculate?.();
  const structured = Object.fromEntries(STRUCTURED_FIELDS.map(([name, selector]) => [name, $(selector)?.value || ""]));
  const styles = buildStyleSaveRows({ slots: currentStyleSlots(), styleData: STYLE_DATA });
  const abilities = buildAbilitySaveSnapshot({
    abilities: ABILITIES,
    values: currentAbilityValues(),
    baselines: styleBaseline
  });
  const cs = buildCsSaveSnapshot({
    current: $("#cs-base")?.value,
    modifier: $("#cs-mod")?.value
  });
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
    cs
  });
}

function collectSkills() {
  return buildSkillSavePayloads(skills, { isStyleSeparator, styleSeparatorMarker: STYLE_SEPARATOR_MARKER });
}

function collectOutfits() {
  return buildOutfitSavePayloads(outfits);
}

function openImport(mode) { importMode = mode; $("#tsv-title").textContent = `${mode.toUpperCase()} TSV取込`; $("#tsv-text").value = ""; $("#tsv-dialog").showModal(); }

function applyImport() {
  const rows = parseSheetTsv($("#tsv-text").value);
  if (importMode === "skd") {
    for (const row of rows) skills.push(buildStyleSkillTsvRow(row, {
      base: blankSkill("style"),
      styleKindFromLabel: label => window.TNXStyleSkillKinds?.fromLabel(label)
    }));
    renderSkills();
  } else {
    for (const row of rows) outfits.push(buildOutfitTsvRow(row, { base: blankOutfit() }));
    renderOutfits();
  }
  recalc(); markDirty();
}