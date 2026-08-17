import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { SITE_BASE_PATH } from "./config.js?v=2";

const STYLE_DETAIL_PREFIX = "@@TNX_STYLE_DETAIL_V1@@";
const STYLE_SEPARATOR_MARKER = "[[STYLE_SEPARATOR]]";
const SUITS = [
  ["reason", "♠"],
  ["passion", "♣"],
  ["life", "♥"],
  ["mundane", "♦"]
];
const DETAIL_FIELDS = ["skill", "limit", "timing", "target", "range", "difficulty", "confrontation", "description", "page"];
const KIND_LABELS = { none: "なし", normal: "通常", secret: "秘技", ultimate: "奥義", direction: "演出", general: "一般", proper: "固有名詞" };
const OUTFIT_LABELS = { weapon: "武器", armor: "防具", cyberware: "サイバーウェア", tron: "トロン", vehicle: "ヴィークル", residence: "住居", other: "その他" };
const PROFILE_FIELDS = [
  "character_name", "character_kana", "handle", "handle_kana", "player_name", "affiliation", "citizen_rank",
  "age", "gender", "height", "weight", "eyes", "hair", "skin",
  "life_path_origin", "life_path_experience", "life_path_encounter", "summary", "profile", "visibility"
];

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

let user = null;
let character = null;
let skills = [];
let outfits = [];
let dirtyProfile = false;
const dirtyStyleSkills = new Set();
let activeSkillId = null;
let saving = false;

init();

async function init() {
  user = await requireAuth();
  if (!user) return;

  const publicId = new URLSearchParams(location.search).get("id");
  if (!publicId) {
    setStatus("モバイル試作版は既存キャストの編集専用です。PC版からキャストを作成してください。", "error");
    disableActions();
    return;
  }

  bindBaseEvents();
  await loadCharacter(publicId);
}

function bindBaseEvents() {
  $("#mobile-profile-form")?.addEventListener("input", () => {
    dirtyProfile = true;
    markDirty();
  });
  $("#mobile-profile-form")?.addEventListener("change", () => {
    dirtyProfile = true;
    markDirty();
  });
  $("#mobile-save")?.addEventListener("click", saveChanges);
  $("#style-skill-dialog-cancel")?.addEventListener("click", () => $("#style-skill-dialog")?.close());
  $("#style-skill-dialog-apply")?.addEventListener("click", event => {
    event.preventDefault();
    applyStyleSkillDialog();
  });
  $("#style-skill-dialog")?.addEventListener("cancel", event => {
    event.preventDefault();
    $("#style-skill-dialog")?.close();
  });
  window.addEventListener("beforeunload", event => {
    if (!isDirty()) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

async function loadCharacter(publicId) {
  setStatus("キャストデータを読み込み中…", "loading");
  try {
    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("public_id", publicId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("編集可能なキャストが見つかりませんでした。");

    const [skillResult, outfitResult] = await Promise.all([
      supabase.from("character_skills").select("*").eq("character_id", data.id).order("sort_order"),
      supabase.from("character_outfits").select("*").eq("character_id", data.id).order("sort_order")
    ]);
    if (skillResult.error) throw skillResult.error;
    if (outfitResult.error) throw outfitResult.error;

    character = data;
    skills = skillResult.data ?? [];
    outfits = outfitResult.data ?? [];
    dirtyProfile = false;
    dirtyStyleSkills.clear();

    renderIdentity();
    fillProfile();
    renderStyleSummary();
    renderAbilitySummary();
    renderGeneralSkills();
    renderStyleSkills();
    renderOutfits();
    updateLinks();
    setStatus("保存済み", "saved");
    setSaveState("saved");
  } catch (error) {
    console.error(error);
    setStatus(`読み込みに失敗しました：${error?.message || "不明なエラー"}`, "error");
    disableActions();
  }
}

function renderIdentity() {
  $("#mobile-character-name").textContent = character.character_name || "名称未設定";
  $("#mobile-character-handle").textContent = character.handle ? `“${character.handle}”` : "NO HANDLE";
  const styles = [1, 2, 3]
    .map(index => [character[`style_${index}`], character[`style_${index}_mark`]])
    .filter(([name]) => name)
    .map(([name, mark]) => `<span>${esc(mark || "")}${esc(name)}</span>`)
    .join("");
  $("#mobile-character-meta").innerHTML = styles || "<span>STYLE NOT SET</span>";
}

function fillProfile() {
  for (const field of PROFILE_FIELDS) {
    const input = document.querySelector(`[data-mobile-character-field="${field}"]`);
    if (!input) continue;
    input.value = character[field] ?? (field === "visibility" ? "private" : "");
  }
}

function renderStyleSummary() {
  const root = $("#mobile-style-summary");
  if (!root) return;
  root.innerHTML = [1, 2, 3].map(index => {
    const name = character[`style_${index}`] || "未設定";
    const mark = character[`style_${index}_mark`] || "";
    const divine = character[`divine_${index}`] || "—";
    return `<article class="mobile-readonly-card"><strong>${esc(mark)}${esc(name)}</strong><small>神業：${esc(divine)}</small></article>`;
  }).join("");
}

function renderAbilitySummary() {
  const root = $("#mobile-ability-summary");
  if (!root) return;
  const defs = [["reason", "理性"], ["passion", "感情"], ["life", "生命"], ["mundane", "外界"]];
  root.innerHTML = defs.map(([key, label]) => {
    const value = character[`${key}_value`] ?? character[`${key}_base`] ?? 0;
    const control = character[`${key}_control`] ?? character[`${key}_control_base`] ?? 0;
    return `<article class="mobile-readonly-card"><strong>${label} ${Number(value) || 0}</strong><small>制御 ${Number(control) || 0}</small></article>`;
  }).join("") + `<article class="mobile-readonly-card"><strong>CS ${Number(character.cs ?? character.cs_base) || 0}</strong><small>現在は参照のみ</small></article>`;
}

function renderGeneralSkills() {
  const root = $("#mobile-general-skills");
  if (!root) return;
  const list = skills.filter(skill => skill.category !== "style");
  root.innerHTML = list.length ? list.map(skill => {
    const suits = SUITS.filter(([key]) => skill[key]).map(([, mark]) => mark).join("");
    return `<article class="mobile-readonly-card"><strong>${esc(skill.name || "名称未設定")}</strong><small>LV ${Number(skill.level) || 0}　${esc(suits || "—")}</small></article>`;
  }).join("") : '<p class="mobile-sheet-section__note">登録なし</p>';
}

function isSeparator(skill) {
  if (skill?.category !== "style") return false;
  const text = String(skill.description || "");
  if (text.startsWith(STYLE_SEPARATOR_MARKER)) return true;
  if (!text.startsWith(STYLE_DETAIL_PREFIX)) return false;
  try {
    return String(JSON.parse(text.slice(STYLE_DETAIL_PREFIX.length).trim())?.description || "").startsWith(STYLE_SEPARATOR_MARKER);
  } catch {
    return false;
  }
}

function emptyDetail() {
  return Object.fromEntries(DETAIL_FIELDS.map(key => [key, ""]));
}

function parseDetail(value) {
  const text = String(value || "");
  const data = emptyDetail();
  if (text.startsWith(STYLE_DETAIL_PREFIX)) {
    try { return { ...data, ...JSON.parse(text.slice(STYLE_DETAIL_PREFIX.length).trim()) }; } catch {}
  }
  const labels = { "技能": "skill", "上限": "limit", "タイミング": "timing", "対象": "target", "射程": "range", "目標値": "difficulty", "対決": "confrontation", "参照P": "page" };
  const description = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^：:]+)[：:]\s*(.*)$/);
    const key = match && labels[match[1].trim()];
    if (key) data[key] = match[2];
    else description.push(line);
  }
  data.description = description.join("\n").trim();
  return data;
}

function encodeDetail(data) {
  return STYLE_DETAIL_PREFIX + "\n" + JSON.stringify(Object.fromEntries(DETAIL_FIELDS.map(key => [key, String(data[key] ?? "")]))) ;
}

function renderStyleSkills() {
  const root = $("#mobile-style-skills");
  if (!root) return;
  const list = skills.filter(skill => skill.category === "style");
  if (!list.length) {
    root.innerHTML = '<p class="mobile-sheet-section__note">スタイル技能は登録されていません。</p>';
    return;
  }
  root.innerHTML = list.map(skill => {
    if (isSeparator(skill)) {
      return `<div class="mobile-readonly-card"><strong>${esc(skill.name || "スタイル技能")}</strong><small>STYLE SECTION</small></div>`;
    }
    const detail = parseDetail(skill.description);
    const suits = SUITS.filter(([key]) => skill[key]).map(([, mark]) => mark).join("");
    const timing = detail.timing || skill.timing || "—";
    return `<button type="button" class="mobile-edit-card" data-mobile-style-skill="${esc(skill.id)}">
      <span class="mobile-edit-card__top"><span class="mobile-edit-card__name">${esc(skill.name || "名称未設定")}</span><span class="mobile-edit-card__level">LV ${Number(skill.level) || 0}</span></span>
      <span class="mobile-edit-card__meta"><span>${esc(KIND_LABELS[skill.skill_kind] || skill.skill_kind || "通常")}</span><span class="mobile-edit-card__suits">${esc(suits || "—")}</span><span>${esc(timing)}</span></span>
    </button>`;
  }).join("");
  root.querySelectorAll("[data-mobile-style-skill]").forEach(button => button.addEventListener("click", () => openStyleSkillDialog(button.dataset.mobileStyleSkill)));
}

function renderOutfits() {
  const root = $("#mobile-outfits");
  if (!root) return;
  root.innerHTML = outfits.length ? outfits.map(outfit => `<article class="mobile-readonly-card"><strong>${esc(outfit.name || "名称未設定")}</strong><small>${esc(OUTFIT_LABELS[outfit.category] || outfit.category || "その他")}　常備化 ${Number(outfit.experience_cost) || 0}</small></article>`).join("") : '<p class="mobile-sheet-section__note">登録なし</p>';
}

function openStyleSkillDialog(id) {
  const skill = skills.find(item => String(item.id) === String(id));
  if (!skill || isSeparator(skill)) return;
  activeSkillId = skill.id;
  const detail = parseDetail(skill.description);
  $("#style-skill-dialog-title").textContent = skill.name || "スタイル技能編集";
  $("#mobile-style-name").value = skill.name || "";
  $("#mobile-style-kind").value = ["normal", "secret", "ultimate", "direction"].includes(skill.skill_kind) ? skill.skill_kind : "normal";
  $("#mobile-style-level").value = Math.max(0, Number(skill.level) || 0);
  for (const [key] of SUITS) $("#mobile-style-suit-" + key).checked = Boolean(skill[key]);
  for (const key of DETAIL_FIELDS) {
    const input = document.querySelector(`[data-mobile-style-detail="${key}"]`);
    if (input) input.value = detail[key] || "";
  }
  $("#style-skill-dialog").showModal();
}

function applyStyleSkillDialog() {
  const skill = skills.find(item => String(item.id) === String(activeSkillId));
  if (!skill) return;
  skill.name = $("#mobile-style-name").value;
  skill.skill_kind = $("#mobile-style-kind").value;
  skill.level = Math.max(0, Number($("#mobile-style-level").value) || 0);
  for (const [key] of SUITS) skill[key] = $("#mobile-style-suit-" + key).checked;
  const suitCount = SUITS.filter(([key]) => skill[key]).length;
  skill.level = Math.max(skill.level, suitCount);
  skill.free_level = Math.min(Math.max(Number(skill.free_level || 0), 0), skill.level);
  const detail = emptyDetail();
  for (const key of DETAIL_FIELDS) {
    const input = document.querySelector(`[data-mobile-style-detail="${key}"]`);
    detail[key] = input?.value || "";
  }
  skill.description = encodeDetail(detail);
  dirtyStyleSkills.add(String(skill.id));
  markDirty();
  renderStyleSkills();
  $("#style-skill-dialog").close();
}

function collectProfileUpdate() {
  const payload = {};
  for (const field of PROFILE_FIELDS) {
    const input = document.querySelector(`[data-mobile-character-field="${field}"]`);
    if (input) payload[field] = input.value;
  }
  payload.character_name = String(payload.character_name || "").trim();
  payload.player_name = String(payload.player_name || "").trim();
  payload.character_kana = String(payload.character_kana || "").trim();
  payload.handle = String(payload.handle || "").trim();
  payload.handle_kana = String(payload.handle_kana || "").trim();
  payload.affiliation = String(payload.affiliation || "").trim();
  payload.citizen_rank = String(payload.citizen_rank || "").trim();
  payload.visibility = payload.visibility === "public" ? "public" : "private";
  return payload;
}

function collectStyleSkillUpdate(skill) {
  return {
    name: skill.name || "",
    level: Number(skill.level || 0),
    free_level: Math.min(Math.max(Number(skill.free_level || 0), 0), Math.max(Number(skill.level || 0), 0)),
    skill_kind: skill.skill_kind || "normal",
    reason: Boolean(skill.reason),
    passion: Boolean(skill.passion),
    life: Boolean(skill.life),
    mundane: Boolean(skill.mundane),
    timing: skill.timing || "",
    target: skill.target || "",
    range: skill.range || "",
    difficulty: skill.difficulty || "",
    confrontation: skill.confrontation || "",
    description: skill.description || "",
    sort_order: Number(skill.sort_order || 0)
  };
}

async function saveChanges() {
  if (saving || !character || !isDirty()) return;
  const profilePayload = dirtyProfile ? collectProfileUpdate() : null;
  if (profilePayload && (!profilePayload.character_name || !profilePayload.player_name)) {
    setStatus("キャスト名とプレイヤー名は必須です。", "error");
    return;
  }

  saving = true;
  setSaveState("saving");
  setStatus("保存中…", "loading");
  try {
    if (profilePayload) {
      const { error } = await supabase.from("characters").update(profilePayload).eq("id", character.id).eq("owner_id", user.id);
      if (error) throw error;
      Object.assign(character, profilePayload);
    }

    for (const id of [...dirtyStyleSkills]) {
      const skill = skills.find(item => String(item.id) === id);
      if (!skill) continue;
      const { error } = await supabase.from("character_skills").update(collectStyleSkillUpdate(skill)).eq("id", skill.id).eq("character_id", character.id);
      if (error) throw error;
    }

    dirtyProfile = false;
    dirtyStyleSkills.clear();
    renderIdentity();
    setStatus("保存済み", "saved");
    setSaveState("saved");
  } catch (error) {
    console.error(error);
    setStatus(`保存に失敗しました：${error?.message || "不明なエラー"}`, "error");
    setSaveState("dirty");
  } finally {
    saving = false;
  }
}

function isDirty() { return dirtyProfile || dirtyStyleSkills.size > 0; }
function markDirty() {
  setStatus("未保存の変更があります", "dirty");
  setSaveState("dirty");
}
function setStatus(message, state) {
  const status = $("#mobile-save-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state || "";
}
function setSaveState(state) {
  const button = $("#mobile-save");
  if (!button) return;
  button.dataset.state = state;
  button.disabled = state === "saving";
  button.textContent = state === "saving" ? "保存中…" : state === "dirty" ? "変更を保存" : "保存済み";
}
function disableActions() {
  const button = $("#mobile-save");
  if (button) button.disabled = true;
}
function updateLinks() {
  const id = encodeURIComponent(character.public_id);
  const pc = $("#mobile-pc-link");
  const view = $("#mobile-view-link");
  if (pc) pc.href = `${SITE_BASE_PATH}sheet.html?id=${id}`;
  if (view) view.href = `${SITE_BASE_PATH}cast.html?id=${id}`;
}
