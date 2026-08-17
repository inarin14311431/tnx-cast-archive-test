import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";

const ABILITIES = ["reason", "passion", "life", "mundane"];
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
const num = value => Number(value || 0);

let user = null;
let character = null;
let activeIndex = 0;

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
  renderSummary();
}

function ensureStyleSheet() {
  if (document.querySelector('link[data-mobile-style-editor-style]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./css-next/pages/sheet-mobile-style.css?v=2";
  link.dataset.mobileStyleEditorStyle = "1";
  document.head.append(link);
}

function injectDialog() {
  if ($("#mobile-style-dialog")) return;
  const options = ['<option value="">選択</option>', ...STYLE_DATA.map(item => `<option value="${esc(item.name)}">${esc(item.name)}</option>`)].join("");
  const attrs = ['<option value="">属性を選択</option>', ...UTSUWA_ATTRIBUTES.map(item => `<option value="${esc(item.name)}">${esc(item.name)}</option>`)].join("");
  const dialog = document.createElement("dialog");
  dialog.id = "mobile-style-dialog";
  dialog.className = "mobile-editor-dialog";
  dialog.innerHTML = `<form method="dialog">
    <header class="mobile-editor-dialog__header">
      <button id="mobile-style-dialog-close" type="button">閉じる</button>
      <strong id="mobile-style-dialog-title">スタイル編集</strong>
      <button id="mobile-style-dialog-apply" type="submit">反映</button>
    </header>
    <div class="mobile-editor-dialog__body">
      <div class="mobile-style-editor-grid">
        <label>スタイル<select id="mobile-style-name">${options}</select></label>
        <label>指定<select id="mobile-style-mark"><option value="">無印</option><option>◎</option><option>●</option><option>◎●</option></select></label>
        <label id="mobile-style-attribute-wrap" class="mobile-span-2" hidden>ウツワ属性<select id="mobile-style-attribute">${attrs}</select></label>
        <section class="mobile-style-divine mobile-span-2"><span>神業</span><strong id="mobile-style-divine">未選択</strong><small id="mobile-style-divine-yomi"></small></section>
        <section class="mobile-style-baseline-preview mobile-span-2">
          <h3>能力値 / 制御値</h3>
          <div id="mobile-style-baseline-preview"></div>
        </section>
      </div>
    </div>
  </form>`;
  document.body.append(dialog);
}

function bind() {
  $("#mobile-style-summary")?.addEventListener("click", event => {
    const button = event.target.closest("[data-mobile-style-slot]");
    if (button) openDialog(Number(button.dataset.mobileStyleSlot));
  });
  $("#mobile-style-dialog-close")?.addEventListener("click", () => $("#mobile-style-dialog")?.close());
  $("#mobile-style-dialog-apply")?.addEventListener("click", event => {
    event.preventDefault();
    applyDialog();
  });
  $("#mobile-style-dialog")?.addEventListener("cancel", event => {
    event.preventDefault();
    $("#mobile-style-dialog")?.close();
  });
  $("#mobile-style-name")?.addEventListener("change", updateDialogPreview);
  $("#mobile-style-attribute")?.addEventListener("change", updateDialogPreview);
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

function renderSummary() {
  const root = $("#mobile-style-summary");
  if (!root || !character) return;
  root.classList.add("mobile-style-summary-list");
  root.innerHTML = [1,2,3].map(index => {
    const name = character[`style_${index}`] || "未設定";
    const mark = character[`style_${index}_mark`] || "";
    const divine = styleDefinition(name)?.divine || character[`divine_${index}`] || "—";
    return `<button type="button" class="mobile-style-summary-row" data-mobile-style-slot="${index}">
      <strong>${esc(name)}</strong><span class="mobile-style-summary-row__mark">${esc(mark)}</span><span class="mobile-style-summary-row__divine">${esc(divine)}</span>
    </button>`;
  }).join("");
}

function openDialog(index) {
  if (!character || index < 1 || index > 3) return;
  activeIndex = index;
  $("#mobile-style-dialog-title").textContent = `スタイル ${index}`;
  $("#mobile-style-name").value = character[`style_${index}`] || "";
  $("#mobile-style-mark").value = character[`style_${index}_mark`] || "";
  $("#mobile-style-attribute").value = character[`style_${index}_attribute`] || "";
  updateDialogPreview();
  $("#mobile-style-dialog")?.showModal();
}

function previewCharacter() {
  const draft = { ...character };
  draft[`style_${activeIndex}`] = $("#mobile-style-name")?.value || "";
  draft[`style_${activeIndex}_attribute`] = draft[`style_${activeIndex}`] === "ウツワ" ? ($("#mobile-style-attribute")?.value || "") : "";
  return draft;
}

function updateDialogPreview() {
  if (!character || !activeIndex) return;
  const name = $("#mobile-style-name")?.value || "";
  const attributeWrap = $("#mobile-style-attribute-wrap");
  const attribute = $("#mobile-style-attribute");
  const isUtsuwa = name === "ウツワ";
  if (attributeWrap) attributeWrap.hidden = !isUtsuwa;
  if (!isUtsuwa && attribute) attribute.value = "";
  const style = styleDefinition(name);
  if ($("#mobile-style-divine")) $("#mobile-style-divine").textContent = style?.divine || "未選択";
  if ($("#mobile-style-divine-yomi")) $("#mobile-style-divine-yomi").textContent = style?.divineYomi || style?.divine || "";
  const baseline = baselineFor(previewCharacter());
  const labels = { reason:"理性", passion:"感情", life:"生命", mundane:"外界" };
  const root = $("#mobile-style-baseline-preview");
  if (root) root.innerHTML = ABILITIES.map(key => `<div><span>${labels[key]}</span><strong>${baseline[key]}</strong><small>制御 ${baseline[`${key}_control`]}</small></div>`).join("");
}

function applyDialog() {
  if (!character || !activeIndex) return;
  const oldBaseline = baselineFor(character);
  const index = activeIndex;
  const name = $("#mobile-style-name")?.value || "";
  const mark = $("#mobile-style-mark")?.value || "";
  const attribute = name === "ウツワ" ? ($("#mobile-style-attribute")?.value || "") : "";
  character[`style_${index}`] = name;
  character[`style_${index}_mark`] = mark;
  character[`style_${index}_attribute`] = attribute;
  const style = styleDefinition(name);
  character[`divine_${index}`] = style?.divine || "";
  character[`divine_${index}_yomi`] = style?.divineYomi || style?.divine || "";

  const nextBaseline = baselineFor(character);
  for (const key of ABILITIES) {
    adjustBaseline(key, oldBaseline[key], nextBaseline[key]);
    adjustBaseline(`${key}_control`, oldBaseline[`${key}_control`], nextBaseline[`${key}_control`]);
  }

  const patch = collectPatch();
  window.dispatchEvent(new CustomEvent("tnx:mobile-style-patch", { detail: patch }));
  renderSummary();
  $("#mobile-style-dialog")?.close();
}

function adjustBaseline(key, oldBaseline, nextBaseline) {
  const baseField = `${key}_base`;
  const valueField = key.endsWith("_control") ? key : `${key}_value`;
  const growthField = `${key}_growth`;
  const gearField = `${key}_gear`;
  const manualField = `${key}_manual`;
  const currentBase = num(character[baseField] ?? (key.endsWith("_control") ? character[key] : character[`${key}_value`]));
  if (currentBase === num(oldBaseline) || currentBase === 0) character[baseField] = num(nextBaseline);
  const base = num(character[baseField]);
  character[growthField] = Math.max(0, base - num(nextBaseline));
  const final = base + num(character[gearField]) + num(character[manualField]);
  character[valueField] = final;
}

function collectPatch() {
  const patch = {};
  for (let i = 1; i <= 3; i++) {
    ["", "_mark", "_attribute"].forEach(suffix => { patch[`style_${i}${suffix}`] = character[`style_${i}${suffix}`] || ""; });
    patch[`divine_${i}`] = character[`divine_${i}`] || "";
    patch[`divine_${i}_yomi`] = character[`divine_${i}_yomi`] || "";
  }
  for (const key of ABILITIES) {
    ["base", "growth", "gear", "manual", "value", "control_base", "control_growth", "control_gear", "control_manual", "control"].forEach(suffix => {
      patch[`${key}_${suffix}`] = num(character[`${key}_${suffix}`]);
    });
  }
  return patch;
}
