import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num = value => Number(value || 0);
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;

const SUITS = [["reason","♠","♤"],["passion","♣","♧"],["life","♥","♡"],["mundane","♦","♢"]];
const STYLE_PREFIX = "@@TNX_STYLE_DETAIL_V1@@";
const STYLE_SEPARATOR = "[[STYLE_SEPARATOR]]";
const DETAIL_FIELDS = ["skill","limit","timing","target","range","difficulty","confrontation","description","page"];
const MUTABLE_GENERAL_PREFIXES = ["製作：","芸術：","操縦："];
const CATEGORY_LABELS = {general:"一般技能",social:"社会",connection:"コネ"};
const KIND_LABELS = {normal:"通常",secret:"秘技",ultimate:"奥義",direction:"演出",none:"なし"};

let user = null;
let character = null;
let skills = [];
let activeGeneralId = "";
let activeStyleId = "";
let activeSeparatorId = "";
let orderDirty = false;
const dirtyIds = new Set();
const deletedIds = new Set();

function markDirty() {
  const button = $("#mobile-save");
  if (button) { button.dataset.state = "dirty"; button.textContent = "変更を保存"; }
  const status = $("#mobile-save-status");
  if (status) { status.dataset.state = "dirty"; status.textContent = "未保存の変更があります"; }
}

function isNew(item) { return Boolean(item?._new); }
function byId(id) { return skills.find(item => String(item.id) === String(id)); }
function isSeparator(item) {
  if (!item || item.category !== "style") return false;
  if (item._separator) return true;
  const text = String(item.description || "");
  if (text.startsWith(STYLE_SEPARATOR)) return true;
  if (!text.startsWith(STYLE_PREFIX)) return false;
  try { return String(JSON.parse(text.slice(STYLE_PREFIX.length).trim())?.description || "").startsWith(STYLE_SEPARATOR); }
  catch { return false; }
}
function mutableGeneralName(item) {
  return item?.category === "general" && MUTABLE_GENERAL_PREFIXES.some(prefix => String(item.name || "").startsWith(prefix));
}
function minLevel(item) {
  if (!item) return 0;
  if (item.category === "general" && (isNew(item) && !String(item.name || "").trim() || mutableGeneralName(item))) return 0;
  return 1;
}
function canRename(item) {
  if (!item) return false;
  if (isNew(item)) return true;
  if (item.category !== "general") return true;
  return mutableGeneralName(item);
}
function canDeleteGeneral(item) { return isNew(item); }

function blankSkill(category) {
  return {
    id:uid("skill"), _new:true, category, name:"", level:category === "general" ? 0 : 1, free_level:0,
    skill_kind:category === "style" ? "normal" : "proper",
    reason:false, passion:false, life:false, mundane:false,
    timing:"", target:"", range:"", difficulty:"", confrontation:"", description:"", sort_order:nextSort()
  };
}
function nextSort() {
  return skills.length ? Math.max(...skills.map(item => num(item.sort_order))) + 10 : 0;
}

function suitString(item) {
  return SUITS.map(([key,filled,outline]) => item[key] ? filled : outline).join("");
}
function selectedSuitCount(item) { return SUITS.reduce((count,[key]) => count + (item[key] ? 1 : 0), 0); }
function normalizeSkillLevel(item, source = "level", changedKey = "") {
  const floor = item.category === "style" ? 0 : minLevel(item);
  let level = Math.max(floor, num(item.level));
  const count = selectedSuitCount(item);
  if (source === "suit") {
    if (changedKey && item[changedKey]) level = Math.max(level, count);
    else level = Math.max(floor, count);
  }
  if (source === "level" && level >= 4) for (const [key] of SUITS) item[key] = true;
  item.level = Math.max(floor, level);
  item.free_level = Math.min(Math.max(0, num(item.free_level)), item.level);
}

function installGeneralDialog() {
  if ($("#mobile-general-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "mobile-general-dialog";
  dialog.className = "mobile-editor-dialog";
  dialog.innerHTML = `<form method="dialog"><header class="mobile-editor-dialog__header mobile-editor-dialog__header--close-only"><button type="button" id="mobile-general-close">閉じる</button><strong id="mobile-general-title">技能編集</strong></header><div class="mobile-editor-dialog__body"><div class="mobile-form-grid mobile-form-grid--two"><label class="mobile-span-2">名称<input id="mobile-general-name"></label><label>レベル<input id="mobile-general-level" type="number" min="0" inputmode="numeric"></label><div class="mobile-span-2 mobile-suit-grid">${SUITS.map(([key,mark]) => `<label><input type="checkbox" data-mobile-general-suit="${key}"><span>${mark}</span></label>`).join("")}</div><p id="mobile-general-policy" class="mobile-span-2 mobile-editor-policy-note"></p><button type="button" id="mobile-general-delete" class="mobile-danger-action mobile-span-2">この技能を削除</button></div></div></form>`;
  document.body.append(dialog);
}

function installSeparatorDialog() {
  if ($("#mobile-separator-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "mobile-separator-dialog";
  dialog.className = "mobile-editor-dialog mobile-separator-dialog";
  dialog.innerHTML = `<form method="dialog"><header class="mobile-editor-dialog__header mobile-editor-dialog__header--close-only"><button type="button" id="mobile-separator-close">閉じる</button><strong>区切り編集</strong></header><div class="mobile-editor-dialog__body"><div class="mobile-form-grid"><label>名称<input id="mobile-separator-name" placeholder="区切り"></label><p class="mobile-editor-policy-note">区切りの位置は一覧の↑／↓で移動できます。</p><button type="button" id="mobile-separator-delete" class="mobile-danger-action">この区切りを削除</button></div></div></form>`;
  document.body.append(dialog);
}

function installToolbars() {
  const general = $("#mobile-general .mobile-sheet-section__body");
  if (general && !general.querySelector('[data-mobile-skills-general-toolbar]')) {
    const bar = document.createElement("div");
    bar.className = "mobile-section-addbar mobile-section-addbar--three";
    bar.dataset.mobileSkillsGeneralToolbar = "1";
    bar.innerHTML = `<button type="button" class="mobile-section-add" data-add-skill="general">＋ 一般技能</button><button type="button" class="mobile-section-add" data-add-skill="social">＋ 社会</button><button type="button" class="mobile-section-add" data-add-skill="connection">＋ コネ</button>`;
    general.prepend(bar);
  }
  const style = $("#mobile-style-skills-section .mobile-sheet-section__body");
  if (style && !style.querySelector('[data-mobile-skills-style-toolbar]')) {
    const bar = document.createElement("div");
    bar.className = "mobile-section-addbar mobile-section-addbar--two";
    bar.dataset.mobileSkillsStyleToolbar = "1";
    bar.innerHTML = `<button type="button" class="mobile-section-add" data-add-skill="style">＋ スタイル技能</button><button type="button" class="mobile-section-add" data-add-separator>＋ 区切り</button>`;
    style.prepend(bar);
  }
}

function renderGeneral() {
  const root = $("#mobile-general-skills");
  if (!root) return;
  const visible = skills.filter(item => ["general","social","connection"].includes(item.category) && !deletedIds.has(String(item.id)));
  root.innerHTML = ["general","social","connection"].map(category => {
    const list = visible.filter(item => item.category === category);
    return `<section class="mobile-general-group" data-skill-category="${category}"><h3>${CATEGORY_LABELS[category]}</h3><div class="mobile-general-table"><div class="mobile-general-row mobile-general-row--head" aria-hidden="true"><span>名称</span><span>LV</span>${SUITS.map(([,mark]) => `<span>${mark}</span>`).join("")}</div>${list.map(item => `<button type="button" class="mobile-general-row mobile-general-row--button${isNew(item)?" is-pending":""}" data-general-id="${esc(item.id)}"><span class="mobile-general-display-name">${esc(item.name || "名称未入力")}</span><strong>${Math.max(minLevel(item),num(item.level))}</strong>${SUITS.map(([key,filled,outline]) => `<span class="mobile-general-display-suit${item[key]?" is-selected":""}">${item[key]?filled:outline}</span>`).join("")}</button>`).join("")}</div></section>`;
  }).join("");
}

function parseDetail(item) {
  const data = Object.fromEntries(DETAIL_FIELDS.map(key => [key,""]));
  const text = String(item?.description || "");
  if (text.startsWith(STYLE_PREFIX)) {
    try { return {...data,...JSON.parse(text.slice(STYLE_PREFIX.length).trim())}; } catch {}
  }
  return data;
}
function encodeDetail(data) { return STYLE_PREFIX + "\n" + JSON.stringify(Object.fromEntries(DETAIL_FIELDS.map(key => [key,String(data[key] ?? "")]))); }

function styleCard(item) {
  const detail = parseDetail(item);
  return `<button type="button" class="mobile-edit-card${isNew(item)?" is-pending":""}" data-style-id="${esc(item.id)}"><span class="mobile-edit-card__top"><span class="mobile-edit-card__name">${esc(item.name || "名称未入力")}</span><span class="mobile-edit-card__level">LV ${num(item.level)}</span></span><span class="mobile-edit-card__meta"><span>${esc(KIND_LABELS[item.skill_kind] || "通常")}</span><span class="mobile-edit-card__suits">${suitString(item)}</span><span>${esc(detail.timing || item.timing || "—")}</span>${isNew(item)?"<span>未保存</span>":""}</span></button>`;
}
function separatorCard(item) {
  return `<div class="mobile-style-separator${isNew(item)?" is-pending":""}" data-separator-id="${esc(item.id)}"><button type="button" class="mobile-style-separator__name" data-edit-separator="${esc(item.id)}"><strong>${esc(item.name || "区切り")}</strong><small>STYLE SECTION</small></button><div class="mobile-style-separator__actions"><button type="button" data-move-separator="up" aria-label="上へ">↑</button><button type="button" data-move-separator="down" aria-label="下へ">↓</button><button type="button" data-delete-separator aria-label="削除">×</button></div></div>`;
}
function renderStyle() {
  const root = $("#mobile-style-skills");
  if (!root) return;
  const list = skills.filter(item => item.category === "style" && !deletedIds.has(String(item.id))).sort((a,b) => num(a.sort_order)-num(b.sort_order));
  root.innerHTML = list.length ? list.map(item => isSeparator(item) ? separatorCard(item) : styleCard(item)).join("") : '<p class="mobile-sheet-section__note">スタイル技能は登録されていません。</p>';
}

function openGeneral(id) {
  const item = byId(id);
  if (!item) return;
  activeGeneralId = String(item.id);
  const rename = canRename(item);
  const floor = minLevel(item);
  $("#mobile-general-title").textContent = `${CATEGORY_LABELS[item.category]}編集`;
  $("#mobile-general-name").value = item.name || "";
  $("#mobile-general-name").readOnly = !rename;
  $("#mobile-general-name").classList.toggle("is-readonly", !rename);
  $("#mobile-general-level").min = String(floor);
  $("#mobile-general-level").value = String(Math.max(floor,num(item.level)));
  for (const [key] of SUITS) $(`[data-mobile-general-suit="${key}"]`).checked = Boolean(item[key]);
  $("#mobile-general-delete").hidden = !canDeleteGeneral(item);
  $("#mobile-general-policy").textContent = !rename ? "名称は基本技能のため固定です。" : (floor > 0 ? `最低レベルはLV${floor}です。` : "");
  $("#mobile-general-dialog").showModal();
  requestAnimationFrame(() => (rename ? $("#mobile-general-name") : $("#mobile-general-level"))?.focus());
}
function commitGeneral(source = "close", changedKey = "") {
  const item = byId(activeGeneralId);
  if (!item) return;
  if (canRename(item)) item.name = $("#mobile-general-name").value;
  item.level = Math.max(minLevel(item),num($("#mobile-general-level").value));
  for (const [key] of SUITS) item[key] = $(`[data-mobile-general-suit="${key}"]`).checked;
  normalizeSkillLevel(item, source, changedKey);
  dirtyIds.add(String(item.id));
  $("#mobile-general-level").value = String(item.level);
  for (const [key] of SUITS) $(`[data-mobile-general-suit="${key}"]`).checked = Boolean(item[key]);
  markDirty();
  renderGeneral();
}
function closeGeneral() {
  if (activeGeneralId) commitGeneral("close");
  activeGeneralId = "";
  $("#mobile-general-dialog")?.close();
}
function deleteGeneral() {
  const item = byId(activeGeneralId);
  if (!item || !isNew(item)) return;
  skills = skills.filter(row => String(row.id) !== String(item.id));
  dirtyIds.delete(String(item.id));
  activeGeneralId = "";
  $("#mobile-general-dialog")?.close();
  renderGeneral();
  markDirty();
}

function openStyle(id) {
  const item = byId(id);
  if (!item || isSeparator(item)) return;
  activeStyleId = String(item.id);
  const detail = parseDetail(item);
  $("#style-skill-dialog-title").textContent = item.name || (isNew(item) ? "スタイル技能追加" : "スタイル技能編集");
  $("#mobile-style-name").value = item.name || "";
  $("#mobile-style-kind").value = ["normal","secret","ultimate","direction"].includes(item.skill_kind) ? item.skill_kind : "normal";
  $("#mobile-style-level").value = String(Math.max(0,num(item.level)));
  for (const [key] of SUITS) $("#mobile-style-suit-"+key).checked = Boolean(item[key]);
  for (const key of DETAIL_FIELDS) {
    const input = document.querySelector(`[data-mobile-style-detail="${key}"]`);
    if (input) input.value = detail[key] || "";
  }
  $("#mobile-style-delete").hidden = false;
  $("#style-skill-dialog")?.showModal();
}
function commitStyle(source = "close", changedKey = "") {
  const item = byId(activeStyleId);
  if (!item || isSeparator(item)) return;
  item.name = $("#mobile-style-name").value;
  item.skill_kind = $("#mobile-style-kind").value || "normal";
  item.level = Math.max(0,num($("#mobile-style-level").value));
  for (const [key] of SUITS) item[key] = $("#mobile-style-suit-"+key).checked;
  normalizeSkillLevel(item, source, changedKey);
  const detail = {};
  for (const key of DETAIL_FIELDS) detail[key] = document.querySelector(`[data-mobile-style-detail="${key}"]`)?.value || "";
  item.description = encodeDetail(detail);
  dirtyIds.add(String(item.id));
  markDirty();
  renderStyle();
}
function closeStyle() {
  if (activeStyleId) commitStyle("close");
  activeStyleId = "";
  $("#style-skill-dialog")?.close();
}
function deleteStyle() {
  const item = byId(activeStyleId);
  if (!item) return;
  if (!confirm(`「${item.name || "名称未入力"}」を削除しますか？`)) return;
  if (isNew(item)) skills = skills.filter(row => String(row.id) !== String(item.id));
  else deletedIds.add(String(item.id));
  dirtyIds.delete(String(item.id));
  activeStyleId = "";
  $("#style-skill-dialog")?.close();
  renderStyle();
  markDirty();
}

function openSeparator(id) {
  const item = byId(id);
  if (!item || !isSeparator(item)) return;
  activeSeparatorId = String(item.id);
  $("#mobile-separator-name").value = item.name || "";
  $("#mobile-separator-dialog")?.showModal();
  requestAnimationFrame(() => $("#mobile-separator-name")?.focus());
}
function commitSeparator() {
  const item = byId(activeSeparatorId);
  if (!item) return;
  item.name = $("#mobile-separator-name").value;
  dirtyIds.add(String(item.id));
  markDirty();
  renderStyle();
}
function closeSeparator() {
  if (activeSeparatorId) commitSeparator();
  activeSeparatorId = "";
  $("#mobile-separator-dialog")?.close();
}
function deleteSeparator(id = activeSeparatorId) {
  const item = byId(id);
  if (!item) return;
  if (!confirm(`「${item.name || "区切り"}」を削除しますか？`)) return;
  if (isNew(item)) skills = skills.filter(row => String(row.id) !== String(item.id));
  else deletedIds.add(String(item.id));
  dirtyIds.delete(String(item.id));
  activeSeparatorId = "";
  $("#mobile-separator-dialog")?.close();
  renderStyle();
  markDirty();
}
function moveSeparator(id, direction) {
  const list = skills.filter(item => item.category === "style" && !deletedIds.has(String(item.id))).sort((a,b)=>num(a.sort_order)-num(b.sort_order));
  const index = list.findIndex(item => String(item.id) === String(id));
  if (index < 0) return;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  list.forEach((item,i) => { item.sort_order = i * 10; dirtyIds.add(String(item.id)); });
  orderDirty = true;
  markDirty();
  renderStyle();
}

function addSkill(category) {
  const item = blankSkill(category);
  skills.push(item);
  dirtyIds.add(String(item.id));
  markDirty();
  if (category === "style") { renderStyle(); openStyle(item.id); }
  else { renderGeneral(); openGeneral(item.id); }
}
function addSeparator() {
  const item = blankSkill("style");
  item._separator = true;
  item.skill_kind = "none";
  item.level = 1;
  item.description = STYLE_SEPARATOR;
  skills.push(item);
  dirtyIds.add(String(item.id));
  orderDirty = true;
  markDirty();
  renderStyle();
  openSeparator(item.id);
}

function payload(item) {
  return {
    character_id:character.id, category:item.category, name:item.name || "", level:num(item.level),
    free_level:Math.min(num(item.free_level),num(item.level)), skill_kind:item.skill_kind || (item.category === "style" ? "normal" : "proper"),
    reason:Boolean(item.reason), passion:Boolean(item.passion), life:Boolean(item.life), mundane:Boolean(item.mundane),
    timing:item.timing || "", target:item.target || "", range:item.range || "", difficulty:item.difficulty || "",
    confrontation:item.confrontation || "", description:item.description || "", sort_order:num(item.sort_order)
  };
}

async function flush() {
  if (!character) return;
  if (activeGeneralId) commitGeneral("close");
  if (activeStyleId) commitStyle("close");
  if (activeSeparatorId) commitSeparator();
  for (const id of deletedIds) {
    const { error } = await supabase.from("character_skills").delete().eq("id", id).eq("character_id", character.id);
    if (error) throw error;
  }
  for (const item of skills) {
    if (deletedIds.has(String(item.id)) || !dirtyIds.has(String(item.id))) continue;
    if (isNew(item)) {
      if (!isSeparator(item) && !String(item.name || "").trim()) continue;
      const { data, error } = await supabase.from("character_skills").insert(payload(item)).select("*").single();
      if (error) throw error;
      Object.assign(item, data, {_new:false,_separator:isSeparator(item)});
    } else {
      const { error } = await supabase.from("character_skills").update(payload(item)).eq("id", item.id).eq("character_id", character.id);
      if (error) throw error;
    }
  }
  skills = skills.filter(item => !deletedIds.has(String(item.id)) && !(isNew(item) && !isSeparator(item) && !String(item.name || "").trim()));
  dirtyIds.clear();
  deletedIds.clear();
  orderDirty = false;
  renderGeneral();
  renderStyle();
  document.dispatchEvent(new CustomEvent("tnx:mobile-skills-saved"));
}

function hasChanges() { return dirtyIds.size > 0 || deletedIds.size > 0 || orderDirty; }

function bind() {
  document.addEventListener("click", event => {
    const add = event.target.closest('[data-add-skill]');
    if (add) { addSkill(add.dataset.addSkill); return; }
    if (event.target.closest('[data-add-separator]')) { addSeparator(); return; }
    const general = event.target.closest('[data-general-id]');
    if (general) { openGeneral(general.dataset.generalId); return; }
    const style = event.target.closest('[data-style-id]');
    if (style) { openStyle(style.dataset.styleId); return; }
    const separator = event.target.closest('[data-edit-separator]');
    if (separator) { openSeparator(separator.dataset.editSeparator); return; }
    const move = event.target.closest('[data-move-separator]');
    if (move) { moveSeparator(move.closest('[data-separator-id]')?.dataset.separatorId, move.dataset.moveSeparator); return; }
    const del = event.target.closest('[data-delete-separator]');
    if (del) { deleteSeparator(del.closest('[data-separator-id]')?.dataset.separatorId); }
  });

  $("#mobile-general-close")?.addEventListener("click", closeGeneral);
  $("#mobile-general-delete")?.addEventListener("click", deleteGeneral);
  $("#mobile-general-dialog")?.addEventListener("cancel", event => { event.preventDefault(); closeGeneral(); });
  $("#mobile-general-name")?.addEventListener("input", () => commitGeneral("name"));
  $("#mobile-general-level")?.addEventListener("change", () => commitGeneral("level"));
  for (const [key] of SUITS) $(`[data-mobile-general-suit="${key}"]`)?.addEventListener("change", () => commitGeneral("suit",key));

  const styleDialog = $("#style-skill-dialog");
  $("#style-skill-dialog-apply")?.remove();
  styleDialog?.querySelector('.mobile-editor-dialog__header')?.classList.add("mobile-editor-dialog__header--close-only");
  if (styleDialog && !$("#mobile-style-delete")) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "mobile-style-delete";
    button.className = "mobile-danger-action";
    button.textContent = "このスタイル技能を削除";
    styleDialog.querySelector('.mobile-editor-dialog__body')?.append(button);
  }
  $("#style-skill-dialog-cancel")?.addEventListener("click", closeStyle);
  styleDialog?.addEventListener("cancel", event => { event.preventDefault(); closeStyle(); });
  $("#mobile-style-delete")?.addEventListener("click", deleteStyle);
  $("#mobile-style-name")?.addEventListener("input", () => commitStyle("name"));
  $("#mobile-style-level")?.addEventListener("change", () => commitStyle("level"));
  for (const [key] of SUITS) $("#mobile-style-suit-"+key)?.addEventListener("change", () => commitStyle("suit",key));
  styleDialog?.querySelectorAll('[data-mobile-style-detail],#mobile-style-kind').forEach(control => control.addEventListener("change", () => commitStyle("detail")));
  styleDialog?.querySelector('[data-mobile-style-detail="description"]')?.addEventListener("input", () => commitStyle("detail"));

  $("#mobile-separator-close")?.addEventListener("click", closeSeparator);
  $("#mobile-separator-delete")?.addEventListener("click", () => deleteSeparator());
  $("#mobile-separator-dialog")?.addEventListener("cancel", event => { event.preventDefault(); closeSeparator(); });
  $("#mobile-separator-name")?.addEventListener("input", commitSeparator);

  document.addEventListener("tnx:mobile-before-save", event => { if (hasChanges()) event.detail.add(flush()); });
  window.addEventListener("beforeunload", event => { if (!hasChanges()) return; event.preventDefault(); event.returnValue = ""; });
}

async function load() {
  const result = await supabase.from("character_skills").select("*").eq("character_id", character.id).order("sort_order");
  if (result.error) throw result.error;
  skills = (result.data || []).map(item => ({...item,_new:false,_separator:isSeparator(item)}));
  renderGeneral();
  renderStyle();
}

async function init() {
  installGeneralDialog();
  installSeparatorDialog();
  installToolbars();
  bind();
  user = await requireAuth();
  if (!user) return;
  const publicId = new URLSearchParams(location.search).get("id");
  if (!publicId) return;
  const { data, error } = await supabase.from("characters").select("id").eq("public_id", publicId).eq("owner_id", user.id).maybeSingle();
  if (error || !data) { if (error) console.error(error); return; }
  character = data;
  try { await load(); } catch (error) { console.error(error); }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
