import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const params = new URLSearchParams(location.search);
const publicId = params.get("id")?.trim() || "";
const editRequested = params.get("edit") === "1";
const requestedCharacter = params.get("character")?.trim() || "";
const view = document.querySelector("#troop-view");
const editor = document.querySelector("#troop-editor");
const errorBox = document.querySelector("#troop-error");
const status = document.querySelector("#troop-editor-status");
let user = null;
let troop = null;
let ownedCharacters = [];

initialize();

async function initialize() {
  const auth = await supabase.auth.getUser();
  user = auth.data?.user ?? null;
  if (editRequested && !user) {
    user = await requireAuth();
    if (!user) return;
  }
  if (publicId) {
    const result = await supabase.from("troops").select("*").eq("public_id", publicId).maybeSingle();
    if (result.error || !result.data) return showError("トループデータが見つからないか、閲覧権限がありません。");
    troop = result.data;
  }
  if (editRequested) {
    if (troop && troop.owner_id !== user.id) return showError("このトループを編集する権限がありません。");
    await loadOwnedCharacters();
    renderEditor();
  } else if (troop) {
    await renderView();
  } else {
    showError("トループIDが指定されていません。");
  }
}

async function loadOwnedCharacters() {
  const result = await supabase.from("characters").select("id, public_id, character_name, handle").eq("owner_id", user.id).order("character_name");
  if (result.error) throw result.error;
  ownedCharacters = result.data ?? [];
}

function renderEditor() {
  editor.hidden = false;
  view.hidden = true;
  const characterSelect = document.querySelector("#troop-character");
  characterSelect.innerHTML = `<option value="">未設定</option>${ownedCharacters.map(c => `<option value="${c.id}">${escapeHtml(c.character_name)}</option>`).join("")}`;
  const presetCharacter = troop?.character_id || ownedCharacters.find(c => c.public_id === requestedCharacter)?.id || "";
  characterSelect.value = presetCharacter;
  setValue("#troop-name", troop?.name || "");
  setValue("#troop-visibility", troop?.visibility || "private");
  setValue("#troop-level", troop?.level ?? 0);
  setValue("#troop-member-max", troop?.member_max ?? 1);
  setValue("#troop-member-current", troop?.member_current ?? 1);
  setValue("#troop-style-1", troop?.style_1 || "");
  setValue("#troop-style-2", troop?.style_2 || "");
  setValue("#troop-style-3", troop?.style_3 || "");
  for (const [key, field] of [["reason_value","reason-value"],["reason_control","reason-control"],["passion_value","passion-value"],["passion_control","passion-control"],["life_value","life-value"],["life_control","life-control"],["mundane_value","mundane-value"],["mundane_control","mundane-control"]]) setValue(`#troop-${field}`, troop?.[key] ?? 0);
  setValue("#troop-notes", troop?.notes || "");
  const skillRoot = document.querySelector("#troop-skills-editor");
  const outfitRoot = document.querySelector("#troop-outfits-editor");
  (troop?.skills ?? []).forEach(skill => addSkillRow(skill));
  (troop?.outfits ?? []).forEach(outfit => addOutfitRow(outfit));
  if (!skillRoot.children.length) addSkillRow();
  if (!outfitRoot.children.length) addOutfitRow();
  document.querySelector("#troop-skill-add").addEventListener("click", () => addSkillRow());
  document.querySelector("#troop-outfit-add").addEventListener("click", () => addOutfitRow());
  editor.addEventListener("submit", saveTroop);
  const deleteButton = document.querySelector("#troop-delete");
  deleteButton.hidden = !troop;
  deleteButton.addEventListener("click", deleteTroop);
  if (troop) document.querySelector("#troop-cancel").href = `./troop.html?id=${encodeURIComponent(troop.public_id)}`;
}

async function renderView() {
  view.hidden = false;
  editor.hidden = true;
  document.querySelector("#troop-public-id").textContent = `${troop.public_id} / ${troop.visibility === "public" ? "PUBLIC" : "PRIVATE"}`;
  document.querySelector("#troop-name-view").textContent = troop.name || "名称未設定";
  document.querySelector("#troop-level-view").textContent = troop.level;
  document.querySelector("#troop-member-current-view").textContent = troop.member_current;
  document.querySelector("#troop-member-max-view").textContent = troop.member_max;
  document.querySelector("#troop-styles-view").innerHTML = [troop.style_1,troop.style_2,troop.style_3].filter(Boolean).map(s => `<span>${escapeHtml(s)}</span>`).join("") || `<span>未設定</span>`;
  const abilityRoot = document.querySelector("#troop-abilities-view");
  abilityRoot.innerHTML = [["理性",troop.reason_value,troop.reason_control],["感情",troop.passion_value,troop.passion_control],["生命",troop.life_value,troop.life_control],["外界",troop.mundane_value,troop.mundane_control]].map(([label,value,control]) => `<article><span>${label}</span><strong>${value}</strong><small>制御 ${control}</small></article>`).join("");
  renderDataList("#troop-skills-view", troop.skills, item => `<strong>${escapeHtml(item.name || "名称未設定")}</strong><span>${escapeHtml(skillTypeLabel(item.type))} / SL ${Number(item.level || 0)}</span><p>${escapeHtml(item.notes || "")}</p>`);
  renderDataList("#troop-outfits-view", troop.outfits, item => `<strong>${escapeHtml(item.name || "名称未設定")}</strong><p>${escapeHtml(item.notes || "")}</p>`);
  document.querySelector("#troop-notes-view").textContent = troop.notes || "—";
  const owner = user && troop.owner_id === user.id;
  const editLink = document.querySelector("#troop-edit-link");
  editLink.hidden = !owner;
  if (owner) editLink.href = `./troop.html?id=${encodeURIComponent(troop.public_id)}&edit=1`;
  document.querySelector("#troop-share-button").addEventListener("click", shareTroop);
  if (troop.character_id) await renderLinkedCharacter();
  if (owner) setupMemberControls();
}

async function renderLinkedCharacter() {
  const result = await supabase.from("characters").select("public_id, character_name").eq("id", troop.character_id).maybeSingle();
  const node = document.querySelector("#troop-linked-character-view");
  if (result.data) node.innerHTML = `所属キャスト：<a href="./cast.html?id=${encodeURIComponent(result.data.public_id)}">${escapeHtml(result.data.character_name)}</a>`;
  else node.textContent = "所属キャスト：非公開キャスト";
}

function setupMemberControls() {
  const controls = document.querySelector("#troop-member-controls");
  controls.hidden = false;
  document.querySelector("#troop-member-minus").addEventListener("click", () => changeMembers(-1));
  document.querySelector("#troop-member-plus").addEventListener("click", () => changeMembers(1));
  document.querySelector("#troop-member-reset").addEventListener("click", () => setMembers(troop.member_max));
}

async function changeMembers(delta) { await setMembers(Math.max(0, Math.min(troop.member_max, troop.member_current + delta))); }
async function setMembers(value) {
  const result = await supabase.from("troops").update({ member_current: value }).eq("id", troop.id).eq("owner_id", user.id).select("member_current").single();
  if (result.error) return alert(result.error.message);
  troop.member_current = result.data.member_current;
  document.querySelector("#troop-member-current-view").textContent = troop.member_current;
}

function addSkillRow(data={}) {
  const row = document.createElement("div"); row.className = "troop-editor-row troop-editor-row--skill";
  row.innerHTML = `<input data-field="name" placeholder="技能名" value="${escapeAttr(data.name || "")}"><select data-field="type"><option value="normal">一般</option><option value="secret">秘技</option><option value="ultimate">奥義</option></select><input data-field="level" type="number" min="0" value="${Number(data.level ?? 1)}" aria-label="技能レベル"><input data-field="notes" placeholder="解説／メモ" value="${escapeAttr(data.notes || "")}"><button type="button" data-remove>×</button>`;
  row.querySelector('[data-field="type"]').value = data.type || "normal";
  row.querySelector("[data-remove]").addEventListener("click", () => row.remove());
  document.querySelector("#troop-skills-editor").append(row);
}
function addOutfitRow(data={}) {
  const row = document.createElement("div"); row.className = "troop-editor-row troop-editor-row--outfit";
  row.innerHTML = `<input data-field="name" placeholder="アウトフィット名" value="${escapeAttr(data.name || "")}"><input data-field="notes" placeholder="性能／メモ" value="${escapeAttr(data.notes || "")}"><button type="button" data-remove>×</button>`;
  row.querySelector("[data-remove]").addEventListener("click", () => row.remove());
  document.querySelector("#troop-outfits-editor").append(row);
}

async function saveTroop(event) {
  event.preventDefault();
  const skills = collectRows("#troop-skills-editor", ["name","type","level","notes"]).filter(i => i.name);
  const secrets = skills.filter(i => i.type === "secret").length;
  const ultimates = skills.filter(i => i.type === "ultimate").length;
  if (secrets > 2) return setStatus("秘技は2つまでです。", true);
  if (ultimates > 1) return setStatus("奥義は1つまでです。", true);
  const max = intValue("#troop-member-max"), current = intValue("#troop-member-current");
  if (current > max) return setStatus("現在人数は最大人数以下にしてください。", true);
  const payload = {
    owner_id: user.id,
    character_id: value("#troop-character") || null,
    name: value("#troop-name"), visibility: value("#troop-visibility"), level: intValue("#troop-level"), member_max: max, member_current: current,
    style_1:value("#troop-style-1"),style_2:value("#troop-style-2"),style_3:value("#troop-style-3"),
    reason_value:intValue("#troop-reason-value"),reason_control:intValue("#troop-reason-control"),passion_value:intValue("#troop-passion-value"),passion_control:intValue("#troop-passion-control"),life_value:intValue("#troop-life-value"),life_control:intValue("#troop-life-control"),mundane_value:intValue("#troop-mundane-value"),mundane_control:intValue("#troop-mundane-control"),
    skills, outfits: collectRows("#troop-outfits-editor", ["name","notes"]).filter(i => i.name), notes:value("#troop-notes")
  };
  setStatus("保存中…");
  const result = troop
    ? await supabase.from("troops").update(payload).eq("id", troop.id).eq("owner_id", user.id).select("public_id").single()
    : await supabase.from("troops").insert(payload).select("public_id").single();
  if (result.error) return setStatus(result.error.message, true);
  location.href = `./troop.html?id=${encodeURIComponent(result.data.public_id)}`;
}

async function deleteTroop() {
  if (!troop || !confirm(`「${troop.name}」を削除します。`)) return;
  const result = await supabase.from("troops").delete().eq("id", troop.id).eq("owner_id", user.id);
  if (result.error) return setStatus(result.error.message, true);
  location.href = "./troops.html";
}

async function shareTroop() {
  if (troop.visibility !== "public") return alert("共有URLでRLに確認してもらうには、公開状態を「公開」にしてください。");
  const url = new URL("./troop.html", location.href); url.searchParams.set("id", troop.public_id);
  try { await navigator.clipboard.writeText(url.href); alert("共有URLをコピーしました。"); } catch { prompt("共有URL", url.href); }
}

function collectRows(selector, fields) { return [...document.querySelector(selector).children].map(row => Object.fromEntries(fields.map(f => [f, f === "level" ? Number(row.querySelector(`[data-field="${f}"]`)?.value || 0) : String(row.querySelector(`[data-field="${f}"]`)?.value || "").trim()]))); }
function renderDataList(selector, items, renderer) { const root=document.querySelector(selector); root.innerHTML=(items??[]).length?(items??[]).map(i=>`<article>${renderer(i)}</article>`).join(""):`<p class="empty-data">登録なし</p>`; }
function skillTypeLabel(type){return type === "secret" ? "秘技" : type === "ultimate" ? "奥義" : "一般";}
function value(selector){return String(document.querySelector(selector)?.value ?? "").trim();} function intValue(selector){return Math.max(0,Number.parseInt(value(selector)||"0",10)||0);} function setValue(selector,v){const n=document.querySelector(selector);if(n)n.value=v;}
function setStatus(message,error=false){status.textContent=message;status.dataset.state=error?"error":"working";} function showError(message){errorBox.hidden=false;errorBox.textContent=message;view.hidden=true;editor.hidden=true;}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));} function escapeAttr(v){return escapeHtml(v);}
