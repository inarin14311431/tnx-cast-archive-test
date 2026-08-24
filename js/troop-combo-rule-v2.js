import { supabase } from "./supabase-client.js";

const PACK_PREFIX = "@@TNX_COMBO_CHECK_V2@@";
const comboForm = document.querySelector("#troop-combo-form");
const comboDialog = document.querySelector("#troop-combo-dialog");
const comboStorage = document.querySelector("#troop-combos-editor");
const comboCards = document.querySelector("#troop-combo-cards");
const comboSkillOptions = document.querySelector("#troop-combo-skill-options");
const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
const masterCache = new Map();
let masterAccess = null;
let renderQueued = false;

initialize();

function initialize() {
  if (comboForm) initializeEditorComboV2();
  initializePublicComboView();
}

function initializeEditorComboV2() {
  ensureAllStorageRows();
  insertAutofillNote();

  comboForm.addEventListener("submit", () => {
    packRuleFields();
    queueMicrotask(() => {
      ensureAllStorageRows();
      renderComboCardsV2();
    });
  }, true);

  document.addEventListener("click", event => {
    if (!event.target.closest?.("#troop-combo-add,[data-troop-combo-index]")) return;
    queueMicrotask(hydrateRuleFields);
  });

  comboSkillOptions?.addEventListener("change", event => {
    const input = event.target.closest?.('input[name="skill_choice"]');
    if (!input?.checked) return;
    autofillFromSkill(input.value);
  });

  if (comboStorage) {
    new MutationObserver(() => {
      ensureAllStorageRows();
      queueRenderCards();
    }).observe(comboStorage, { childList:true, subtree:true });
  }

  window.setTimeout(() => {
    ensureAllStorageRows();
    renderComboCardsV2();
  }, 120);
}

function insertAutofillNote() {
  const skills = comboDialog?.querySelector(".troop-combo-skills");
  if (!skills || comboDialog.querySelector(".combo-autofill-note")) return;
  const note = document.createElement("p");
  note.className = "combo-autofill-note";
  note.textContent = "登録済みの技能情報からタイミング・対象・射程・対決を空欄へ自動補完します。達成値目安はアクト運用用の任意入力です。";
  skills.after(note);
}

function ensureAllStorageRows() {
  comboRows().forEach(ensureStorageRow);
}

function ensureStorageRow(row) {
  const legacy = row.querySelector('[data-field="target_value"]');
  if (legacy && !legacy.dataset.comboV2Packed) {
    const parsed = unpackRuleFields(legacy.value);
    legacy.value = packRuleData(parsed);
    legacy.dataset.comboV2Packed = "1";
  }
  const oldLimit = row.querySelector('[data-field="act_use_limit"]');
  if (oldLimit) oldLimit.value = "";
}

function packRuleFields() {
  const legacy = comboForm.elements.namedItem("target_value");
  if (!legacy) return;
  legacy.value = packRuleData({
    expected_value: fieldValue("expected_value"),
    confrontation: fieldValue("confrontation")
  });
}

function hydrateRuleFields() {
  if (!comboDialog?.open || !comboForm) return;
  const legacy = comboForm.elements.namedItem("target_value");
  const parsed = unpackRuleFields(legacy?.value || "");
  setFormField("expected_value", parsed.expected_value);
  setFormField("confrontation", parsed.confrontation);
}

function packRuleData(data) {
  const expectedValue = String(data?.expected_value || "").trim();
  const confrontation = String(data?.confrontation || "").trim();
  return `${PACK_PREFIX}${JSON.stringify({expected_value:expectedValue,confrontation})}`;
}

function unpackRuleFields(value) {
  const text = String(value || "").trim();
  if (!text) return { expected_value:"", confrontation:"" };
  if (!text.startsWith(PACK_PREFIX)) return { expected_value:numericText(text), confrontation:"" };
  try {
    const parsed = JSON.parse(text.slice(PACK_PREFIX.length));
    const legacyDifficulty = numericText(parsed?.difficulty);
    return {
      expected_value:String(parsed?.expected_value || legacyDifficulty || "").trim(),
      confrontation:String(parsed?.confrontation || "").trim()
    };
  } catch {
    return { expected_value:"", confrontation:"" };
  }
}

async function autofillFromSkill(skillName) {
  const source = await findMasterSkill(skillName);
  if (!source) return;
  fillBlank("timing", source.timing);
  fillBlank("target", source.target);
  fillBlank("range", source.range_text);
  fillBlank("confrontation", source.confrontation);
}

async function findMasterSkill(skillName) {
  const key = normalizeSkillName(skillName);
  if (!key) return null;
  if (masterCache.has(key)) return masterCache.get(key);
  if (!(await canUseMaster())) return null;

  const raw = String(skillName || "").trim();
  const stripped = raw.replace(/[@†※]/g, "").trim();
  const candidates = [...new Set([raw, stripped].filter(Boolean))];
  const { data, error } = await supabase
    .from("skd_master")
    .select("name,timing,target,range_text,confrontation")
    .in("name", candidates)
    .limit(20);
  if (error) {
    masterCache.set(key, null);
    return null;
  }
  const match = (data || []).find(row => normalizeSkillName(row.name) === key) || (data || [])[0] || null;
  masterCache.set(key, match);
  return match;
}

async function canUseMaster() {
  if (masterAccess !== null) return masterAccess;
  try {
    const { data, error } = await supabase.rpc("can_use_master_search");
    masterAccess = !error && data === true;
  } catch {
    masterAccess = false;
  }
  return masterAccess;
}

function fillBlank(name, value) {
  const control = comboForm.elements.namedItem(name);
  const next = String(value || "").trim();
  if (!control || control.value.trim() || !next || ["-","－","—","―"].includes(next)) return;
  control.value = next;
  control.classList.add("master-autofill-updated");
  window.setTimeout(() => control.classList.remove("master-autofill-updated"), 1800);
}

function renderComboCardsV2() {
  if (!comboCards || !comboStorage) return;
  const rows = comboRows();
  if (!rows.length) {
    comboCards.innerHTML = `<p class="empty-data">コンボは登録されていません。<small>NO COMBO DATA</small></p>`;
    return;
  }
  comboCards.innerHTML = rows.map((row,index) => {
    const name = rowValue(row,"name") || "名称未設定";
    const ability = abilityText(rowValue(row,"ability"));
    const skills = rowValue(row,"skills") || "組み合わせ技能なし";
    const rule = unpackRuleFields(rowValue(row,"target_value"));
    const detail = [
      rowValue(row,"timing") && `タイミング：${rowValue(row,"timing")}`,
      rowValue(row,"target") && `対象：${rowValue(row,"target")}`,
      rowValue(row,"range") && `射程：${rowValue(row,"range")}`
    ].filter(Boolean).join(" / ");
    return `<button class="combo-card" type="button" data-troop-combo-index="${index}"><div class="combo-card__head"><strong>${escapeHtml(name)}</strong><span class="combo-card__ability">${escapeHtml(ability)}</span></div><p class="combo-card__skills">${escapeHtml(skills)}</p><dl><div><dt>判定修正 <small>MODIFIER</small></dt><dd>${escapeHtml(rowValue(row,"modifier") || "—")}</dd></div><div><dt>達成値目安 <small>EXPECTED VALUE</small></dt><dd>${escapeHtml(rule.expected_value || "—")}</dd></div><div><dt>対決 <small>CONFRONTATION</small></dt><dd>${escapeHtml(rule.confrontation || "—")}</dd></div></dl><p class="combo-card__detail">${escapeHtml(detail || "詳細未登録")}</p><p class="combo-card__description">${escapeHtml(rowValue(row,"description"))}</p></button>`;
  }).join("");
}

function queueRenderCards() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderComboCardsV2();
  });
}

async function initializePublicComboView() {
  const root = document.querySelector("#troop-combos-view");
  if (!root || !publicId) return;
  const view = document.querySelector("#troop-view");
  const renderWhenVisible = async () => {
    if (view?.hidden) return;
    const { data, error } = await supabase.from("troops").select("combos").eq("public_id", publicId).maybeSingle();
    if (error || !data) return;
    renderPublicCombos(root, Array.isArray(data.combos) ? data.combos : []);
  };
  if (view) new MutationObserver(renderWhenVisible).observe(view, { attributes:true, attributeFilter:["hidden"] });
  window.setTimeout(renderWhenVisible, 180);
}

function renderPublicCombos(root, combos) {
  if (!combos.length) {
    root.innerHTML = `<p class="empty-data">登録なし</p>`;
    return;
  }
  root.innerHTML = combos.map(item => {
    const rule = unpackRuleFields(item.target_value);
    const detail = [
      item.timing && `タイミング：${item.timing}`,
      item.target && `対象：${item.target}`,
      item.range && `射程：${item.range}`
    ].filter(Boolean).join(" / ");
    return `<article><div><strong>${escapeHtml(item.name || "名称未設定")}</strong><small>${escapeHtml(abilityText(item.ability))} / ${escapeHtml(item.skills || "技能未設定")}</small></div><div><span>修正 ${escapeHtml(item.modifier || "—")}</span><span>達成値目安 ${escapeHtml(rule.expected_value || "—")}</span><span>対決 ${escapeHtml(rule.confrontation || "—")}</span><span>${escapeHtml(detail || "詳細未登録")}</span></div><p>${escapeHtml(item.description || "")}</p></article>`;
  }).join("");
}

function comboRows() {
  return comboStorage ? [...comboStorage.children].filter(row => row.matches(".troop-editor-row--combo")) : [];
}
function rowValue(row,field) { return String(row.querySelector(`[data-field="${field}"]`)?.value || "").trim(); }
function fieldValue(name) { return String(comboForm?.elements.namedItem(name)?.value || "").trim(); }
function setFormField(name,value) { const node=comboForm?.elements.namedItem(name); if(node) node.value=value || ""; }
function numericText(value) {
  const text = String(value || "").trim();
  return /^[-+]?\d+$/.test(text) ? text : "";
}
function abilityText(value) {
  const labels={reason:"♠ 理性",passion:"♣ 感情",life:"♥ 生命",mundane:"♦ 外界"};
  const keys=String(value||"").split(",").map(v=>v.trim()).filter(Boolean);
  return keys.length ? keys.map(key=>labels[key]||key).join(" / ") : "能力未指定";
}
function normalizeSkillName(value) { return String(value||"").normalize("NFKC").replace(/[@†※]/g,"").replace(/\s+/g,"").trim().toLowerCase(); }
function escapeHtml(value) { return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
