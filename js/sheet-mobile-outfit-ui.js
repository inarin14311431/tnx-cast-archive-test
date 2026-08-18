import {
  LABELS,
  RANGE_OPTIONS,
  SLOT_OPTIONS,
  CONTROL_OPTIONS,
  parseConcealment,
  parseDefense,
  normalizeNumber
} from "./sheet-mobile-outfit-model.js?v=2";

const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

export function ensureOutfitStylesheet() {
  let link = document.querySelector("link[data-mobile-outfit-style]");
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.dataset.mobileOutfitStyle = "1";
    document.head.append(link);
  }
  link.href = "./css-next/pages/sheet-mobile-outfit.css?v=7";
}

export function ensureOutfitToolbar() {
  const body = document.querySelector("#mobile-outfits-section .mobile-sheet-section__body");
  if (!body || body.querySelector("[data-mobile-outfit-toolbar]")) return;
  const bar = document.createElement("div");
  bar.className = "mobile-section-addbar";
  bar.dataset.mobileOutfitToolbar = "1";
  bar.innerHTML = '<button type="button" class="mobile-section-add" id="mobile-outfit-add">＋ アウトフィット</button>';
  body.prepend(bar);
}

export function ensureOutfitDialog() {
  if (document.querySelector("#mobile-outfit-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "mobile-outfit-dialog";
  dialog.className = "mobile-editor-dialog";
  dialog.innerHTML = `<form method="dialog"><header class="mobile-editor-dialog__header mobile-editor-dialog__header--close-only"><button id="mobile-outfit-close" type="button">閉じる</button><strong id="mobile-outfit-title">アウトフィット編集</strong></header><div class="mobile-editor-dialog__body"><div id="mobile-outfit-fields" class="mobile-outfit-editor"></div></div></form>`;
  document.body.append(dialog);
}

export function renderOutfitCards({ root, outfits, deletedIds, dirtyIds }) {
  if (!root) return;
  const visible = outfits.filter(item => !deletedIds.has(String(item.id)));
  root.innerHTML = visible.length ? visible.map(item => {
    const pending = item._new || dirtyIds.has(String(item.id));
    return `<button type="button" class="mobile-outfit-card${pending ? " is-pending" : ""}" data-mobile-outfit="${esc(item.id)}"><strong>${esc(item.name || "名称未入力")}</strong><span>${esc(LABELS[item.category] || "分類未選択")}</span><small>常備化 ${normalizeNumber(item.experience_cost)}${pending ? ' / <b class="mobile-unsaved-label">未保存</b>' : ""}</small></button>`;
  }).join("") : '<p class="mobile-sheet-section__note">登録なし</p>';
}

function optionList(values, current = "") {
  const options = [...values];
  if (current && !options.includes(current)) options.push(current);
  return options.map(value => `<option value="${esc(value)}" ${String(value) === String(current) ? "selected" : ""}>${value ? esc(value) : "選択"}</option>`).join("");
}

function controlOptions(current) {
  return CONTROL_OPTIONS.map(value => `<option value="${value}" ${Number(current) === value ? "selected" : ""}>${value > 0 ? "+" : ""}${value}</option>`).join("");
}

const detailValue = (item, field) => item.ofc_details?.[field] ?? "";
const detailField = (item, field, label, options = {}) => {
  const value = detailValue(item, field);
  const attrs = options.type ? ` type="${options.type}"${options.inputmode ? ` inputmode="${options.inputmode}"` : ""}${options.step ? ` step="${options.step}"` : ""}` : "";
  return `<label>${label}<input data-outfit-detail="${field}"${attrs} value="${esc(value)}"></label>`;
};

function commonBaseFields(item) {
  return `<fieldset class="mobile-outfit-group"><legend>基本</legend><div class="mobile-outfit-group__grid">
    <label class="mobile-outfit-editor__name">名称<input data-outfit-field="name" value="${esc(item.name || "")}"></label>
    <label>購入<input data-outfit-field="purchase_value" type="number" step="1" inputmode="numeric" value="${esc(item.purchase_value ?? "")}"></label>
    <label>常備化<input data-outfit-field="experience_cost" type="number" step="1" min="0" inputmode="numeric" value="${esc(item.experience_cost ?? 0)}"></label>
    ${concealFields(item)}
    ${slotField(item)}
  </div></fieldset>`;
}

function commonOfcFields(item) {
  return `<fieldset class="mobile-outfit-group"><legend>OFC情報</legend><div class="mobile-outfit-group__grid">
    ${detailField(item, "major_category", "OFC大分類")}
    ${detailField(item, "minor_category", "OFC小分類")}
    ${detailField(item, "manufacturer", "メーカー")}
    ${detailField(item, "page_number", "参照P")}
  </div></fieldset>`;
}

function concealFields(item) {
  parseConcealment(item);
  return `<label>隠匿値<input data-outfit-transient="conceal-value" value="${esc(item._concealValue || "")}"></label><label>隠匿修正<input data-outfit-transient="conceal-mod" value="${esc(item._concealMod || "")}"></label>`;
}

function defenseFields(item) {
  parseDefense(item);
  return `<div class="mobile-outfit-defense mobile-span-2"><span>防御値</span><label>S<input data-outfit-transient="def-s" type="number" step="1" inputmode="numeric" value="${esc(item._defS || "")}"></label><label>P<input data-outfit-transient="def-p" type="number" step="1" inputmode="numeric" value="${esc(item._defP || "")}"></label><label>I<input data-outfit-transient="def-i" type="number" step="1" inputmode="numeric" value="${esc(item._defI || "")}"></label></div>`;
}

const slotField = item => `<label>部位<select data-outfit-field="slot">${optionList(SLOT_OPTIONS, item.slot || "")}</select></label>`;
const rangeField = item => `<label>射程<select data-outfit-field="range">${optionList(RANGE_OPTIONS, item.range || "")}</select></label>`;
const controlField = item => `<label>制御<select data-outfit-field="control_modifier">${controlOptions(item.control_modifier)}</select></label>`;
const csModifierField = item => `<label>CS修正<input data-outfit-field="cs_modifier" type="number" step="1" inputmode="numeric" value="${esc(item.cs_modifier ?? 0)}"></label>`;

function performanceFields(item) {
  let fields = "";
  switch (item.category) {
    case "weapon":
      fields = `<label>攻撃<input data-outfit-field="attack" value="${esc(item.attack || "")}"></label>${rangeField(item)}${detailField(item, "parry", "受")}${detailField(item, "speed", "ス")}${detailField(item, "electronic_control", "電制")}`;
      break;
    case "armor":
      fields = `${defenseFields(item)}${controlField(item)}${detailField(item, "electronic_control", "電制")}`;
      break;
    case "cyberware":
      fields = `${controlField(item)}${csModifierField(item)}${detailField(item, "electronic_control", "電制")}${detailField(item, "ianus_surface", "IANUS 表")}${detailField(item, "ianus_deep", "IANUS 深")}${detailField(item, "ianus_none", "IANUS 無")}`;
      break;
    case "tron":
      fields = `${controlField(item)}${csModifierField(item)}${detailField(item, "electronic_control", "電制")}${detailField(item, "tron_software", "ソフトウェア")}${detailField(item, "tron_support", "サポート")}${detailField(item, "tron_hardware", "ハードウェア")}`;
      break;
    case "vehicle":
      fields = `<label>攻撃<input data-outfit-field="attack" value="${esc(item.attack || "")}"></label>${defenseFields(item)}${controlField(item)}${csModifierField(item)}${detailField(item, "parry", "受")}${detailField(item, "speed", "ス")}${detailField(item, "electronic_control", "電制")}${detailField(item, "cs_value", "CS値")}${detailField(item, "crew", "乗員")}${detailField(item, "sf", "SF")}`;
      break;
    case "residence":
      fields = `${detailField(item, "electronic_control", "電制")}${detailField(item, "residence_entry", "登場")}${detailField(item, "residence_electric", "電力")}${detailField(item, "residence_area", "エリア")}`;
      break;
    case "other":
      fields = `${controlField(item)}${csModifierField(item)}${detailField(item, "electronic_control", "電制")}${detailField(item, "cs_value", "CS値")}`;
      break;
    default:
      return "";
  }
  return `<fieldset class="mobile-outfit-group"><legend>性能</legend><div class="mobile-outfit-group__grid">${fields}</div></fieldset>`;
}

export function buildOutfitEditor(item) {
  const categories = `<option value="">分類を選択</option>${Object.entries(LABELS).map(([value, label]) => `<option value="${value}" ${item.category === value ? "selected" : ""}>${label}</option>`).join("")}`;
  return `<div class="mobile-outfit-editor__grid">
    <label class="mobile-outfit-editor__category">分類<select data-outfit-field="category">${categories}</select></label>
    ${item.category ? `${commonBaseFields(item)}${commonOfcFields(item)}${performanceFields(item)}<fieldset class="mobile-outfit-group"><legend>解説</legend><div class="mobile-outfit-group__grid"><label class="mobile-outfit-editor__description">解説<textarea rows="7" data-outfit-field="description">${esc(item.description || "")}</textarea></label></div></fieldset><button type="button" class="mobile-danger-action mobile-outfit-editor__description" data-outfit-delete>このアウトフィットを削除</button>` : '<p class="mobile-outfit-category-hint mobile-span-2">まず分類を選択してください。分類に応じた入力項目を表示します。</p>'}
  </div>`;
}
