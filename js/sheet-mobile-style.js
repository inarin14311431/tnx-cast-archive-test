import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";

const ABILITIES = ["reason", "passion", "life", "mundane"];
const MARKS = ["", "◎", "●", "◎●"];
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
const num = value => Number(value || 0);

let user = null;
let character = null;
let repairingSummary = false;

init();

async function init() {
  user = await requireAuth();
  if (!user) return;
  const publicId = new URLSearchParams(location.search).get("id");
  if (!publicId) return;
  ensureStyleSheet();
  injectDialog();
  bind();
  const { data, error } = await supabase.from("characters").select("*").eq("public_id", publicId).eq("owner_id", user.id).maybeSingle();
  if (error || !data) {
    if (error) console.error(error);
    return;
  }
  character = data;
  normalizeLoadedMarks();
  renderSummary();
  renderEditor();
  observeSummaryOwner();
}

function ensureStyleSheet() {
  if (document.querySelector('link[data-mobile-style-editor-style]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./css-next/pages/sheet-mobile-style.css?v=6";
  link.dataset.mobileStyleEditorStyle = "1";
  document.head.append(link);
}

function styleOptions(selected = "") {
  return ['<option value="">選択</option>', ...STYLE_DATA.map(item => `<option value="${esc(item.name)}" ${item.name === selected ? "selected" : ""}>${esc(item.name)}</option>`)].join("");
}

function attributeOptions(selected = "") {
  return ['<option value="">属性を選択</option>', ...UTSUWA_ATTRIBUTES.map(item => `<option value="${esc(item.name)}" ${item.name === selected ? "selected" : ""}>${esc(item.name)}</option>`)].join("");
}

function injectDialog() {
  if ($("#mobile-style-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "mobile-style-dialog";
  dialog.className = "mobile-editor-dialog";
  dialog.innerHTML = `<form method="dialog">
    <header class="mobile-editor-dialog__header mobile-editor-dialog__header--close-only">
      <button id="mobile-style-dialog-close" type="button">閉じる</button>
      <strong>スタイル編集</strong>
    </header>
    <div class="mobile-editor-dialog__body">
      <div id="mobile-style-editor-list" class="mobile-style-editor-list"></div>
    </div>
  </form>`;
  document.body.append(dialog);
}

function bind() {
  $("#mobile-style-summary")?.addEventListener("click", event => {
    if (!event.target.closest("[data-mobile-style-slot]")) return;
    renderEditor();
    $("#mobile-style-dialog")?.showModal();
  });
  $("#mobile-style-dialog-close")?.addEventListener("click", () => $("#mobile-style-dialog")?.close());
  $("#mobile-style-dialog")?.addEventListener("cancel", event => {
    event.preventDefault();
    $("#mobile-style-dialog")?.close();
  });
  $("#mobile-style-editor-list")?.addEventListener("change", event => {
    if (event.target.matches("[data-mobile-style-name], [data-mobile-style-attribute]")) applyEditorChange(Number(event.target.dataset.slot));
  });
  $("#mobile-style-editor-list")?.addEventListener("click", event => {
    const button = event.target.closest("[data-mobile-style-mark]");
    if (!button) return;
    cycleMark(Number(button.dataset.slot));
  });
}

function observeSummaryOwner() {
  const root = $("#mobile-style-summary");
  if (!root) return;
  new MutationObserver(() => {
    if (!character || repairingSummary || root.querySelector("[data-mobile-style-slot]")) return;
    repairingSummary = true;
    renderSummary();
    repairingSummary = false;
  }).observe(root, { childList: true, subtree: true });
}

function styleRecord(name, attribute = "") {
  if (name === "ウツワ") return UTSUWA_ATTRIBUTES.find(item => item.name === attribute) || null;
  return STYLE_DATA.find(item => item.name === name) || null;
}

function styleDefinition(name) {
  return STYLE_DATA.find(item => item.name === name) || null;
}

function baselineFor(source) {
  const result = Object.fromEntries(ABILITIES.flatMap(key => [[key, 0], [`${key}_control`, 0]]));
  for (let i = 1; i <= 3; i++) {
    const record = styleRecord(source[`style_${i}`] || "", source[`style_${i}_attribute`] || "");
    if (!record) continue;
    for (const key of ABILITIES) {
      result[key] += num(record[key]?.[0]);
      result[`${key}_control`] += num(record[key]?.[1]);
    }
  }
  return result;
}

function normalizeLoadedMarks() {
  if (!character) return;
  let personaOwner = 0;
  let keyOwner = 0;
  for (let index = 1; index <= 3; index++) {
    const current = MARKS.includes(character[`style_${index}_mark`]) ? character[`style_${index}_mark`] : "";
    const wantsPersona = current.includes("◎");
    const wantsKey = current.includes("●");
    const keepPersona = wantsPersona && !personaOwner;
    const keepKey = wantsKey && !keyOwner;
    character[`style_${index}_mark`] = keepPersona && keepKey ? "◎●" : keepPersona ? "◎" : keepKey ? "●" : "";
    if (keepPersona) personaOwner = index;
    if (keepKey) keyOwner = index;
  }
}

function renderSummary() {
  const root = $("#mobile-style-summary");
  if (!root || !character) return;
  root.className = "mobile-style-summary-list";
  root.innerHTML = [1, 2, 3].map(index => {
    const name = character[`style_${index}`] || "未設定";
    const mark = character[`style_${index}_mark`] || "";
    const style = styleDefinition(name);
    const divine = style?.divine || character[`divine_${index}`] || "—";
    const divineYomi = style?.divineYomi || character[`divine_${index}_yomi`] || divine;
    return `<button type="button" class="mobile-style-summary-row" data-mobile-style-slot="${index}">
      <span class="mobile-style-summary-row__style"><strong>${esc(name)}</strong>${mark ? `<b>${esc(mark)}</b>` : ""}</span>
      <span class="mobile-style-summary-row__divine"><ruby><strong>${esc(divine)}</strong><rt>${esc(divineYomi)}</rt></ruby></span>
    </button>`;
  }).join("");
}

function renderEditor() {
  const root = $("#mobile-style-editor-list");
  if (!root || !character) return;
  root.innerHTML = [1, 2, 3].map(index => {
    const name = character[`style_${index}`] || "";
    const mark = character[`style_${index}_mark`] || "";
    const attribute = character[`style_${index}_attribute`] || "";
    const isUtsuwa = name === "ウツワ";
    return `<section class="mobile-style-editor-row" data-style-editor-row="${index}">
      <div class="mobile-style-editor-row__main">
        <label><span>STYLE ${index}</span><select data-mobile-style-name data-slot="${index}">${styleOptions(name)}</select></label>
        <button type="button" class="mobile-style-mark-cycle" data-mobile-style-mark data-slot="${index}" aria-label="PERSONA / KEYを切り替え">${esc(mark || "なし")}</button>
      </div>
      ${isUtsuwa ? `<label class="mobile-style-attribute-row"><span>ウツワ属性</span><select data-mobile-style-attribute data-slot="${index}">${attributeOptions(attribute)}</select></label>` : ""}
    </section>`;
  }).join("");
}

function cycleMark(index) {
  if (!character || index < 1 || index > 3) return;
  const current = character[`style_${index}_mark`] || "";
  const position = MARKS.indexOf(current);
  const next = MARKS[(position < 0 ? 0 : position + 1) % MARKS.length];
  applyExclusiveMark(index, next);
  renderEditor();
}

function applyExclusiveMark(index, next) {
  const patch = {};
  for (let other = 1; other <= 3; other++) {
    if (other === index) continue;
    const current = character[`style_${other}_mark`] || "";
    let replacement = current;
    if (next === "◎●") replacement = "";
    else if (next === "◎") {
      if (current === "◎") replacement = "";
      else if (current === "◎●") replacement = "●";
    } else if (next === "●") {
      if (current === "●") replacement = "";
      else if (current === "◎●") replacement = "◎";
    }
    if (replacement !== current) patch[other] = replacement;
  }
  patch[index] = next;
  for (const [slot, mark] of Object.entries(patch)) character[`style_${slot}_mark`] = mark;
  window.dispatchEvent(new CustomEvent("tnx:mobile-style-patch", { detail: collectPatch() }));
  renderSummary();
}

function applyEditorChange(index) {
  if (!character || index < 1 || index > 3) return;
  const name = document.querySelector(`[data-mobile-style-name][data-slot="${index}"]`)?.value || "";
  const attribute = name === "ウツワ" ? (document.querySelector(`[data-mobile-style-attribute][data-slot="${index}"]`)?.value || "") : "";
  applyStylePatch(index, { name, attribute });
  renderEditor();
}

function applyStylePatch(index, patch) {
  const oldBaseline = baselineFor(character);
  if (Object.hasOwn(patch, "name")) character[`style_${index}`] = patch.name;
  if (Object.hasOwn(patch, "attribute")) character[`style_${index}_attribute`] = patch.attribute;
  if (character[`style_${index}`] !== "ウツワ") character[`style_${index}_attribute`] = "";

  const style = styleDefinition(character[`style_${index}`] || "");
  character[`divine_${index}`] = style?.divine || "";
  character[`divine_${index}_yomi`] = style?.divineYomi || style?.divine || "";

  const nextBaseline = baselineFor(character);
  for (const key of ABILITIES) {
    adjustBaseline(key, oldBaseline[key], nextBaseline[key]);
    adjustBaseline(`${key}_control`, oldBaseline[`${key}_control`], nextBaseline[`${key}_control`]);
  }

  window.dispatchEvent(new CustomEvent("tnx:mobile-style-patch", { detail: collectPatch() }));
  renderSummary();
}

function adjustBaseline(key, oldBaseline, nextBaseline) {
  const baseField = `${key}_base`;
  const valueField = key.endsWith("_control") ? key : `${key}_value`;
  const growthField = `${key}_growth`;
  const gearField = `${key}_gear`;
  const manualField = `${key}_manual`;
  const currentBase = num(character[baseField] ?? (key.endsWith("_control") ? character[key] : character[`${key}_value`]));
  const growth = Math.max(0, num(character[growthField] || (currentBase - num(oldBaseline))));
  character[growthField] = growth;
  character[baseField] = num(nextBaseline) + growth;
  character[valueField] = character[baseField] + num(character[gearField]) + num(character[manualField]);
}

function collectPatch() {
  const patch = {};
  for (let i = 1; i <= 3; i++) {
    ["", "_mark", "_attribute"].forEach(suffix => patch[`style_${i}${suffix}`] = character[`style_${i}${suffix}`] || "");
    patch[`divine_${i}`] = character[`divine_${i}`] || "";
    patch[`divine_${i}_yomi`] = character[`divine_${i}_yomi`] || "";
  }
  for (const key of ABILITIES) {
    ["base", "growth", "gear", "manual", "value", "control_base", "control_growth", "control_gear", "control_manual", "control"].forEach(suffix => patch[`${key}_${suffix}`] = num(character[`${key}_${suffix}`]));
  }
  return patch;
}
