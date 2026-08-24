import { GENERAL_MASTER_ROWS, initialGeneralSkillSuit } from "./general-skill-catalog.js";

const ABILITIES = ["reason", "passion", "life", "mundane"];
const SUITS = {
  reason: { off:"♤", on:"♠", label:"理性" },
  passion:{ off:"♧", on:"♣", label:"感情" },
  life:   { off:"♡", on:"♥", label:"生命" },
  mundane:{ off:"♢", on:"♦", label:"外界" }
};
const STYLE_COST = { none:0, normal:10, secret:20, ultimate:50, direction:2 };

if (document.body.dataset.page === "troop.html") {
  installStylesheet();
  requestAnimationFrame(refineTroopEditor);
}

function installStylesheet() {
  if (document.querySelector('link[href*="troop-density-v3.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./css-next/pages/troop-density-v3.css?v=1";
  document.head.append(link);
}

function refineTroopEditor() {
  const editor = document.querySelector("#troop-editor");
  if (!editor || editor.hidden) return;
  refineBasicFields();
  refineStyleSection();
  rebuildGeneralSkills();
  addSkillFieldLabels();
  compactCombos();
  refreshExperience();
  editor.addEventListener("input", () => queueMicrotask(refreshExperience));
  editor.addEventListener("change", () => queueMicrotask(refreshExperience));
}

function refineBasicFields() {
  ["#troop-level", "#troop-member-max"].forEach(selector => {
    const input = document.querySelector(selector);
    if (!input) return;
    input.max = "999";
    input.classList.add("troop-short-number");
    input.closest("label")?.classList.add("troop-short-number-field");
  });
}

function refineStyleSection() {
  const style = document.querySelector("#troop-style");
  const section = style?.closest(".troop-section");
  if (!section) return;
  section.classList.add("troop-section--style-primary");
  const heading = section.querySelector("h2");
  if (heading && !heading.querySelector(".troop-important-badge")) heading.insertAdjacentHTML("beforeend", '<span class="troop-important-badge">PRIMARY</span>');
}

function rebuildGeneralSkills() {
  const root = document.querySelector("#troop-general-skills-editor");
  if (!root || root.dataset.fixedGrid === "1") return;
  const saved = new Map();
  root.querySelectorAll(":scope > .troop-skill-row").forEach(row => {
    const name = rowValue(row, "name");
    const key = canonicalGeneralName(name);
    if (!key) return;
    saved.set(key, {
      name,
      kind: rowValue(row, "kind"),
      level: rowInt(row, "level"),
      reason: checked(row, "reason"), passion: checked(row, "passion"), life: checked(row, "life"), mundane: checked(row, "mundane")
    });
  });
  root.innerHTML = "";
  root.dataset.fixedGrid = "1";
  GENERAL_MASTER_ROWS.forEach(([baseName, baseSuit, kind]) => root.append(createGeneralRow(baseName, baseSuit, kind, saved.get(baseName))));
  document.querySelector("#troop-general-skill-add")?.remove();
  const note = root.closest(".troop-section")?.querySelector(".troop-rule-note");
  if (note) note.textContent = "一般技能は常時表示。自動取得スートは固定され、追加取得したスートだけ切り替えます。製作・芸術・操縦は必要な場合のみ名称を入力します。";
}

function createGeneralRow(baseName, baseSuit, kind, data = {}) {
  const row = document.createElement("div");
  row.className = "troop-editor-row troop-skill-row troop-general-fixed-row";
  row.dataset.category = "general";
  row.dataset.troopUiEnhanced = "1";
  const fixedSuit = initialGeneralSkillSuit(baseName);
  const isProper = kind === "proper";
  const level = Math.max(isProper ? 0 : 1, Number(data.level || 0));
  const actualName = String(data.name || "");
  const detailValue = isProper && actualName.startsWith(baseName) ? actualName.slice(baseName.length) : "";
  const hiddenName = isProper ? ((detailValue || level > 0) ? `${baseName}${detailValue}` : "") : baseName;
  row.innerHTML = `
    <div class="troop-general-name-cell">
      ${isProper ? `<span class="troop-general-prefix">${escapeHtml(baseName)}</span><input class="troop-general-detail" data-general-detail type="text" value="${escapeAttr(detailValue)}" placeholder="名称">` : `<strong>${escapeHtml(baseName)}</strong>`}
      <input data-field="name" type="hidden" value="${escapeAttr(hiddenName)}">
      <select data-field="kind" hidden><option value="${kind}" selected>${kind}</option></select>
    </div>
    <input class="troop-level-input" data-field="level" type="number" min="${isProper ? 0 : 1}" max="4" value="${level}" aria-label="${escapeAttr(baseName)}レベル">
    <div class="troop-suits">${ABILITIES.map(key => suitMarkup(key, fixedSuit, Boolean(data[key]) || key === fixedSuit)).join("")}</div>`;
  const detail = row.querySelector("[data-general-detail]");
  const levelInput = row.querySelector('[data-field="level"]');
  const syncName = () => {
    if (!isProper) return;
    const text = detail.value.trim();
    row.querySelector('[data-field="name"]').value = (text || Number(levelInput.value || 0) > 0) ? `${baseName}${text}` : "";
  };
  detail?.addEventListener("input", syncName);
  levelInput.addEventListener("input", syncName);
  return row;
}

function suitMarkup(key, fixedSuit, checkedState) {
  const suit = SUITS[key];
  const fixed = key === fixedSuit;
  const fixedClass = fixed ? " troop-suit-toggle--fixed" : "";
  const title = fixed ? `${suit.label}：自動取得スート` : suit.label;
  const checkedAttr = checkedState ? "checked" : "";
  const fixedAttr = fixed ? 'disabled data-auto-suit="1"' : "";
  return `<label class="troop-suit-toggle${fixedClass}" title="${escapeAttr(title)}"><input type="checkbox" data-suit="${key}" ${checkedAttr} ${fixedAttr} aria-label="${suit.label}スート"><span data-off="${suit.off}" data-on="${suit.on}"></span></label>`;
}

function addSkillFieldLabels() {
  const general = document.querySelector("#troop-general-skills-editor");
  if (general && !general.previousElementSibling?.classList.contains("troop-general-field-heads")) {
    general.insertAdjacentHTML("beforebegin", `<div class="troop-general-field-heads" aria-hidden="true"><div><span>技能 <small>SKILL</small></span><span>LV</span><span>スート <small>SUIT</small></span></div><div><span>技能 <small>SKILL</small></span><span>LV</span><span>スート <small>SUIT</small></span></div></div>`);
  }
  const style = document.querySelector("#troop-style-skills-editor");
  if (style && !style.previousElementSibling?.classList.contains("troop-style-field-heads")) {
    style.insertAdjacentHTML("beforebegin", `<div class="troop-style-field-heads" aria-hidden="true"><span>技能名 <small>SKILL</small></span><span>種別 <small>TYPE</small></span><span>LV</span><span>スート <small>SUIT</small></span><span>EXP</span><span>解説 <small>DETAIL</small></span><span></span></div>`);
  }
}

function compactCombos() {
  document.querySelector("#troop-combo-cards")?.classList.add("troop-combo-cards--compact");
}

function refreshExperience() {
  const exp = document.querySelector("#troop-exp");
  if (!exp) return;
  let total = 0;
  document.querySelectorAll("#troop-general-skills-editor .troop-skill-row").forEach(row => {
    const name = rowValue(row, "name");
    if (!name) return;
    const level = rowInt(row, "level");
    const kind = rowValue(row, "kind") || "general";
    const freeLevel = kind === "general" && initialGeneralSkillSuit(name) ? 1 : 0;
    total += Math.max(0, level - freeLevel) * (kind === "proper" ? 5 : 10);
  });
  document.querySelectorAll("#troop-style-skills-editor .troop-skill-row").forEach(row => {
    const level = rowInt(row, "level");
    const kind = rowValue(row, "kind") || "normal";
    total += level * (STYLE_COST[kind] ?? 10);
  });
  exp.value = String(total);
}

function canonicalGeneralName(name) {
  const value = String(name || "").trim();
  return GENERAL_MASTER_ROWS.find(([base, , kind]) => kind === "proper" ? value.startsWith(base) : value === base)?.[0] || "";
}
function checked(row, key) { return Boolean(row.querySelector(`[data-suit="${key}"]`)?.checked); }
function rowValue(row, field) { return String(row.querySelector(`[data-field="${field}"]`)?.value || "").trim(); }
function rowInt(row, field) { return Math.max(0, Number.parseInt(rowValue(row, field) || "0", 10) || 0); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function escapeAttr(value) { return escapeHtml(value); }
