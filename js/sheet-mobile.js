import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { SITE_BASE_PATH } from "./config.js?v=2";

const THEME_STORAGE_KEY = "tnx-cast-site-theme";
const THEME_OPTIONS = [
  ["nova", "トーキョーＮ◎ＶＡ"], ["moon", "オーサカM○●N"], ["star", "カムイST☆R"],
  ["eden", "ミトラスGARDEN"], ["vlad", "ヴラド・コロニー"], ["lutetia", "ヴィル・ヌーヴ・ルテチア"],
  ["buena", "ブエナIЯA"], ["canberra", "キャンベラAXYZ"], ["hongkong", "ホンコンHEAVEN"],
  ["fesler", "フェスラー公国"], ["intron", "イントロン"], ["axleraters", "ニューロ！"],
  ["inagaki", "稲垣 光平"], ["astral", "アストラル"], ["orbital", "軌道"], ["japanese-army", "日本"]
];
const THEME_VALUES = new Set(THEME_OPTIONS.map(([value]) => value));
const PROFILE_FIELDS = [
  "character_name", "character_kana", "handle", "handle_kana", "player_name", "affiliation", "citizen_rank", "birthplace",
  "age", "gender", "height", "weight", "eyes", "hair", "skin",
  "life_path_origin", "life_path_experience", "life_path_encounter", "summary", "profile", "visibility"
];

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const quoteHandle = value => {
  const text = String(value || "").trim();
  if (!text) return "NO HANDLE";
  if (/^(?:“.*”|”.*”|".*"|「.*」|『.*』)$/.test(text)) return text;
  return `“${text}”`;
};

let user = null;
let character = null;
let dirtyProfile = false;
let saving = false;

function ensureProfileSourceFields() {
  const form = $("#mobile-profile-form");
  if (!form) return;
  if (!form.querySelector('[data-mobile-character-field="birthplace"]')) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.dataset.mobileCharacterField = "birthplace";
    form.append(input);
  }
}

function setStatus(message, state = "") {
  const status = $("#mobile-save-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function setSaveState(state) {
  const button = $("#mobile-save");
  if (!button) return;
  button.dataset.state = state;
  button.disabled = state === "saving";
  button.textContent = state === "saving" ? "保存中…" : state === "dirty" ? "変更を保存" : "保存済み";
}

function markDirty() {
  dirtyProfile = true;
  setStatus("未保存の変更があります", "dirty");
  setSaveState("dirty");
}

function bindThemePicker() {
  const select = $("#mobile-theme-select");
  if (!select) return;
  select.replaceChildren(...THEME_OPTIONS.map(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }));
  const current = THEME_VALUES.has(document.documentElement.dataset.theme) ? document.documentElement.dataset.theme : "nova";
  select.value = current;
  select.addEventListener("change", () => {
    const next = THEME_VALUES.has(select.value) ? select.value : "nova";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = ["intron", "orbital"].includes(next) ? "light" : "dark";
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch {}
  });
}

function renderIdentity() {
  if (!character) return;
  $("#mobile-character-name").textContent = character.character_name || "名称未設定";
  $("#mobile-character-handle").textContent = quoteHandle(character.handle);
  const styles = [1, 2, 3]
    .map(index => [character[`style_${index}`], character[`style_${index}_mark`]])
    .filter(([name]) => name)
    .map(([name, mark]) => `<span>${esc(mark || "")}${esc(name)}</span>`)
    .join("");
  $("#mobile-character-meta").innerHTML = styles || "<span>STYLE NOT SET</span>";
}

function fillProfile() {
  if (!character) return;
  ensureProfileSourceFields();
  for (const field of PROFILE_FIELDS) {
    const input = document.querySelector(`[data-mobile-character-field="${field}"]`);
    if (!input) continue;
    const fallback = field === "visibility" ? "private" : field === "birthplace" ? "Ｎ◎ＶＡ" : "";
    input.value = character[field] ?? fallback;
    if (field === "birthplace" && !String(input.value || "").trim()) input.value = "Ｎ◎ＶＡ";
  }
}

function collectProfileUpdate() {
  const payload = {};
  for (const field of PROFILE_FIELDS) {
    const input = document.querySelector(`[data-mobile-character-field="${field}"]`);
    if (input) payload[field] = input.value;
  }
  for (const field of ["character_name","player_name","character_kana","handle","handle_kana","affiliation","citizen_rank","birthplace"]) {
    payload[field] = String(payload[field] || "").trim();
  }
  if (!payload.birthplace) payload.birthplace = "Ｎ◎ＶＡ";
  payload.visibility = payload.visibility === "public" ? "public" : "private";
  return payload;
}

function updateLinks() {
  if (!character) return;
  const id = encodeURIComponent(character.public_id);
  if ($("#mobile-pc-link")) $("#mobile-pc-link").href = `${SITE_BASE_PATH}sheet.html?id=${id}`;
  if ($("#mobile-view-link")) $("#mobile-view-link").href = `${SITE_BASE_PATH}cast.html?id=${id}`;
}

async function saveProfile() {
  if (saving || !character || !dirtyProfile) return;
  const payload = collectProfileUpdate();
  if (!payload.character_name || !payload.player_name) {
    setStatus("キャスト名とプレイヤー名は必須です。", "error");
    return;
  }
  saving = true;
  setSaveState("saving");
  try {
    const { error } = await supabase.from("characters").update(payload).eq("id", character.id).eq("owner_id", user.id);
    if (error) throw error;
    Object.assign(character, payload);
    dirtyProfile = false;
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

function bind() {
  const form = $("#mobile-profile-form");
  form?.addEventListener("input", markDirty);
  form?.addEventListener("change", markDirty);
  $("#mobile-save")?.addEventListener("click", saveProfile);
  window.addEventListener("beforeunload", event => {
    if (!dirtyProfile) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

async function init() {
  ensureProfileSourceFields();
  user = await requireAuth();
  if (!user) return;
  bindThemePicker();
  bind();
  const publicId = new URLSearchParams(location.search).get("id");
  if (!publicId) {
    setStatus("モバイル編集は既存キャスト専用です。PC版からキャストを作成してください。", "error");
    if ($("#mobile-save")) $("#mobile-save").disabled = true;
    return;
  }
  setStatus("キャストデータを読み込み中…", "loading");
  try {
    const { data, error } = await supabase.from("characters").select("*").eq("public_id", publicId).eq("owner_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("編集可能なキャストが見つかりませんでした。");
    character = data;
    fillProfile();
    renderIdentity();
    updateLinks();
    dirtyProfile = false;
    setStatus("保存済み", "saved");
    setSaveState("saved");
  } catch (error) {
    console.error(error);
    setStatus(`読み込みに失敗しました：${error?.message || "不明なエラー"}`, "error");
    if ($("#mobile-save")) $("#mobile-save").disabled = true;
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
