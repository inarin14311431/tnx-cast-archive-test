import { supabase } from "./supabase-client.js";

const STYLE_KIND_LABEL = { none:"なし", normal:"通常", secret:"秘技", ultimate:"奥義", direction:"演出" };
const SUIT_LABELS = { reason:"♠", passion:"♣", life:"♥", mundane:"♦" };
const ABILITIES = ["reason","passion","life","mundane"];
const params = new URLSearchParams(location.search);
const publicId = params.get("id")?.trim() || "";
const editor = document.querySelector("#troop-editor");
const styleRoot = document.querySelector("#troop-style-skills-editor");
let savedStyleSkills = new Map();

void initialize();

async function initialize() {
  if (publicId) await loadSavedStyleSkills();
  installEditorEnhancer();
  installViewEnhancer();
}

async function loadSavedStyleSkills() {
  const { data, error } = await supabase.from("troops").select("skills").eq("public_id", publicId).maybeSingle();
  if (error || !data) return;
  const skills = Array.isArray(data.skills) ? data.skills : [];
  savedStyleSkills = new Map(skills.filter(isStyleSkill).map(item => [normalize(item.name), item]));
}

function installEditorEnhancer() {
  if (!editor || !styleRoot) return;
  const apply = () => {
    if (editor.hidden) return;
    styleRoot.querySelectorAll(":scope > .troop-skill-row").forEach(enhanceStyleRow);
    rewriteStyleFieldHeads();
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(editor, { childList:true, subtree:true, attributes:true, attributeFilter:["hidden"] });
}

function enhanceStyleRow(row) {
  if (row.dataset.styleFieldsV6 === "1") return;
  row.dataset.styleFieldsV6 = "1";
  row.classList.add("troop-style-row-v6");

  const nameInput = row.querySelector('[data-field="name"]');
  const saved = savedStyleSkills.get(normalize(nameInput?.value));
  row.querySelector('[data-field="exp"]')?.remove();

  const notes = row.querySelector('[data-field="notes"]');
  if (!notes) return;
  notes.placeholder = "解説／メモ";

  const timing = document.createElement("input");
  timing.dataset.field = "timing";
  timing.className = "troop-style-meta-input";
  timing.placeholder = "タイミング";
  timing.value = String(saved?.timing || "");
  timing.setAttribute("aria-label", "タイミング");

  const confrontation = document.createElement("input");
  confrontation.dataset.field = "confrontation";
  confrontation.className = "troop-style-meta-input";
  confrontation.placeholder = "対決";
  confrontation.value = String(saved?.confrontation || "");
  confrontation.setAttribute("aria-label", "対決");

  notes.before(timing, confrontation);
}

function rewriteStyleFieldHeads() {
  const heads = document.querySelector(".troop-style-field-heads");
  if (!heads || heads.dataset.fieldsV6 === "1") return;
  heads.dataset.fieldsV6 = "1";
  heads.innerHTML = `<span>技能名 <small>SKILL</small></span><span>種別 <small>TYPE</small></span><span>LV</span><span>スート <small>SUIT</small></span><span>タイミング <small>TIMING</small></span><span>対決 <small>CONFRONTATION</small></span><span>解説 <small>DETAIL</small></span><span></span>`;
}

function installViewEnhancer() {
  const view = document.querySelector("#troop-view");
  const root = document.querySelector("#troop-style-skills-view");
  if (!view || !root || !publicId) return;
  const apply = () => {
    if (view.hidden || !savedStyleSkills.size) return;
    renderStyleSkillView(root, [...savedStyleSkills.values()]);
  };
  apply();
  new MutationObserver(apply).observe(view, { attributes:true, attributeFilter:["hidden"] });
}

function renderStyleSkillView(root, items) {
  if (!items.length) {
    root.innerHTML = `<p class="empty-data">登録なし</p>`;
    return;
  }
  root.innerHTML = items.map(item => {
    const suits = ABILITIES.filter(key => item[key]).map(key => SUIT_LABELS[key]).join("") || "—";
    const kind = item.kind || item.type || "normal";
    const meta = [
      STYLE_KIND_LABEL[kind] || kind,
      `Lv.${Number(item.level || 0)}`,
      suits,
      item.timing ? `タイミング：${item.timing}` : "",
      item.confrontation ? `対決：${item.confrontation}` : ""
    ].filter(Boolean).join(" / ");
    return `<article><strong>${escapeHtml(item.name || "名称未設定")}</strong><span>${escapeHtml(meta)}</span><p>${escapeHtml(item.notes || "")}</p></article>`;
  }).join("");
}

function isStyleSkill(item) {
  return item?.category === "style" || ["normal","secret","ultimate","direction","none"].includes(item?.kind || item?.type);
}
function normalize(value) { return String(value || "").normalize("NFKC").replace(/\s+/g,"").trim().toLowerCase(); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
