import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const $ = s => document.querySelector(s);
const SUITS = [["reason","♠"],["passion","♣"],["life","♥"],["mundane","♦"]];
const STYLE_PREFIX = "@@TNX_STYLE_DETAIL_V1@@";
const STYLE_SEPARATOR = "[[STYLE_SEPARATOR]]";
const DETAIL_FIELDS = ["skill","limit","timing","target","range","difficulty","confrontation","description","page"];
const MUTABLE_GENERAL_PREFIXES = ["製作：","芸術：","操縦："];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num = v => Number(v || 0);
const uid = p => `${p}-${crypto.randomUUID()}`;

let user = null;
let character = null;
let saving = false;
let replaying = false;
let activeGeneral = null;
let activeNewStyle = null;
let existingStyleId = "";
let styleRows = [];
let styleOrderDirty = false;
const newSkills = [];
const deleteSkills = new Set();

function markDirty() {
  const button = $("#mobile-save");
  if (button) { button.dataset.state = "dirty"; button.textContent = "変更を保存"; }
  const status = $("#mobile-save-status");
  if (status) { status.dataset.state = "dirty"; status.textContent = "未保存の変更があります"; }
}

function hasQueued() {
  return newSkills.length > 0 || deleteSkills.size > 0 || styleOrderDirty;
}

function addButton(text, type) {
  return `<button type="button" class="mobile-section-add" data-mobile-queued-add="${type}">${text}</button>`;
}

function installBars() {
  document.querySelectorAll('[data-mobile-add-toolbar],[data-mobile-stage-toolbar]').forEach(node => node.remove());
  const general = $("#mobile-general .mobile-sheet-section__body");
  if (general) {
    const bar = document.createElement("div");
    bar.className = "mobile-section-addbar mobile-section-addbar--three";
    bar.innerHTML = addButton("＋ 一般技能","general") + addButton("＋ 社会","social") + addButton("＋ コネ","connection");
    general.prepend(bar);
  }
  const style = $("#mobile-style-skills-section .mobile-sheet-section__body");
  if (style) {
    const bar = document.createElement("div");
    bar.className = "mobile-section-addbar mobile-section-addbar--two";
    bar.innerHTML = addButton("＋ スタイル技能","style") + addButton("＋ 区切り","separator");
    style.prepend(bar);
  }
}

function installGeneralDialog() {
  if ($("#mobile-queued-general-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "mobile-queued-general-dialog";
  dialog.className = "mobile-editor-dialog";
  dialog.innerHTML = `<form method="dialog"><header class="mobile-editor-dialog__header mobile-editor-dialog__header--close-only"><button type="button" id="mobile-queued-general-close">閉じる</button><strong id="mobile-queued-general-title">技能編集</strong></header><div class="mobile-editor-dialog__body"><div class="mobile-form-grid mobile-form-grid--two"><label class="mobile-span-2">名称<input id="mobile-queued-general-name"></label><label>レベル<input id="mobile-queued-general-level" type="number" min="0" inputmode="numeric"></label><div class="mobile-span-2 mobile-suit-grid">${SUITS.map(([key,mark]) => `<label><input type="checkbox" data-mobile-queued-suit="${key}"><span>${mark}</span></label>`).join("")}</div><p id="mobile-queued-general-note" class="mobile-span-2 mobile-editor-policy-note"></p><button type="button" id="mobile-queued-general-delete" class="mobile-danger-action mobile-span-2">この技能を削除</button></div></div></form>`;
  document.body.append(dialog);
  $("#mobile-queued-general-close").onclick = () => dialog.close();
  dialog.addEventListener("cancel", event => { event.preventDefault(); dialog.close(); });
  dialog.addEventListener("input", syncGeneral);
  dialog.addEventListener("change", syncGeneral);
  $("#mobile-queued-general-delete").onclick = deleteGeneral;
}

function skillBlank(category) {
  return {
    _temp: uid("skill"), category, name:"", level: category === "general" ? 0 : 1, free_level:0,
    skill_kind: category === "style" ? "normal" : "proper",
    reason:false, passion:false, life:false, mundane:false,
    timing:"", target:"", range:"", difficulty:"", confrontation:"", description:"", sort_order:9999
  };
}

function isMutableGeneralName(item) {
  if (item.category !== "general") return true;
  return MUTABLE_GENERAL_PREFIXES.some(prefix => String(item.name || "").startsWith(prefix));
}

function minLevel(item) {
  if (item._temp) return item.category === "general" ? 0 : 1;
  if (item.category === "general" && isMutableGeneralName(item)) return 0;
  return 1;
}

function openGeneral(item, row = null) {
  activeGeneral = { item, row };
  const label = {general:"一般技能",social:"社会",connection:"コネ"}[item.category] || "技能";
  const nameInput = $("#mobile-queued-general-name");
  const levelInput = $("#mobile-queued-general-level");
  const canRename = Boolean(item._temp) || item.category !== "general" || isMutableGeneralName(item);
  const canDelete = Boolean(item._temp);
  const floor = minLevel(item);
  $("#mobile-queued-general-title").textContent = `${label}編集`;
  nameInput.value = item.name || "";
  nameInput.readOnly = !canRename;
  nameInput.classList.toggle("is-readonly", !canRename);
  levelInput.min = String(floor);
  levelInput.value = Math.max(floor, num(item.level));
  for (const [key] of SUITS) $(`[data-mobile-queued-suit="${key}"]`).checked = Boolean(item[key]);
  $("#mobile-queued-general-delete").hidden = !canDelete;
  $("#mobile-queued-general-note").textContent = !canRename
    ? "名称は基本技能のため固定です。レベルとスートのみ編集できます。"
    : (floor > 0 ? `この技能の最低レベルはLV${floor}です。` : "");
  $("#mobile-queued-general-dialog").showModal();
  requestAnimationFrame(() => (canRename ? nameInput : levelInput)?.focus());
}

function syncGeneral(event) {
  if (!activeGeneral) return;
  const { item, row } = activeGeneral;
  const floor = minLevel(item);
  if (event.target.id === "mobile-queued-general-name") {
    if (event.target.readOnly) return;
    item.name = event.target.value;
  } else if (event.target.id === "mobile-queued-general-level") {
    item.level = Math.max(floor, num(event.target.value));
  } else if (event.target.matches('[data-mobile-queued-suit]')) {
    item[event.target.dataset.mobileQueuedSuit] = event.target.checked;
  } else return;

  const suitCount = SUITS.reduce((count,[key]) => count + (item[key] ? 1 : 0), 0);
  if (event.target.matches('[data-mobile-queued-suit]')) {
    if (event.target.checked && item.level < suitCount) item.level = suitCount;
    if (!event.target.checked) item.level = Math.max(floor, suitCount);
  }
  if (event.target.id === "mobile-queued-general-level" && item.level >= 4) {
    for (const [key] of SUITS) item[key] = true;
  }
  item.level = Math.max(floor, num(item.level));
  $("#mobile-queued-general-level").value = item.level;
  for (const [key] of SUITS) $(`[data-mobile-queued-suit="${key}"]`).checked = Boolean(item[key]);

  if (row) {
    const name = row.querySelector('[data-mobile-general-field="name"]');
    const level = row.querySelector('[data-mobile-general-field="level"]');
    if (name && !name.readOnly && name.value !== item.name) { name.value = item.name; name.dispatchEvent(new Event("input", {bubbles:true})); }
    if (level && Number(level.value) !== item.level) { level.value = String(item.level); level.dispatchEvent(new Event("change", {bubbles:true})); }
    for (const [key] of SUITS) {
      const box = row.querySelector(`[data-mobile-general-field="${key}"]`);
      if (box && box.checked !== Boolean(item[key])) { box.checked = Boolean(item[key]); box.dispatchEvent(new Event("change", {bubbles:true})); }
    }
  } else renderPendingGeneral();
  markDirty();
}

function deleteGeneral() {
  if (!activeGeneral?.item?._temp) return;
  const { item } = activeGeneral;
  if (!confirm(`「${item.name || "名称未入力"}」を削除しますか？`)) return;
  const index = newSkills.indexOf(item);
  if (index >= 0) newSkills.splice(index, 1);
  activeGeneral = null;
  $("#mobile-queued-general-dialog").close();
  renderPendingGeneral();
  markDirty();
}

function enhanceGeneral() {
  document.querySelectorAll('[data-mobile-general-skill]').forEach(row => {
    if (row.dataset.mobilePolicyReady === "1") return;
    row.dataset.mobilePolicyReady = "1";
    const heading = row.closest('.mobile-general-group')?.querySelector('h3')?.textContent || "";
    const category = heading.includes("社会") ? "social" : heading.includes("コネ") ? "connection" : "general";
    const nameControl = row.querySelector('[data-mobile-general-field="name"]');
    const levelControl = row.querySelector('[data-mobile-general-field="level"]');
    const currentName = nameControl?.value || "";
    const canRename = category !== "general" || MUTABLE_GENERAL_PREFIXES.some(prefix => currentName.startsWith(prefix));
    if (nameControl && !canRename) {
      nameControl.readOnly = true;
      nameControl.tabIndex = -1;
      nameControl.classList.add("is-readonly");
    }
    const floor = category === "general" && canRename ? 0 : 1;
    if (levelControl) levelControl.min = String(floor);
    row.addEventListener("input", event => clampExistingRow(event, row, floor), true);
    row.addEventListener("change", event => clampExistingRow(event, row, floor), true);

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "mobile-general-edit-trigger";
    edit.textContent = "…";
    edit.setAttribute("aria-label", "技能を編集");
    edit.onclick = () => {
      const item = {id:row.dataset.mobileGeneralSkill, category, name:nameControl?.value || "", level:num(levelControl?.value), free_level:0, skill_kind:"proper"};
      for (const [key] of SUITS) item[key] = Boolean(row.querySelector(`[data-mobile-general-field="${key}"]`)?.checked);
      openGeneral(item, row);
    };
    row.append(edit);
  });
}

function clampExistingRow(event, row, floor) {
  const level = row.querySelector('[data-mobile-general-field="level"]');
  if (!level) return;
  const suits = SUITS.map(([key]) => row.querySelector(`[data-mobile-general-field="${key}"]`));
  let current = Math.max(floor, num(level.value));
  const count = suits.filter(box => box?.checked).length;
  if (event.target.matches('[data-mobile-general-field="level"]')) {
    if (current >= 4) suits.forEach(box => { if (box) box.checked = true; });
  } else if (event.target.matches('[type="checkbox"]')) {
    current = event.target.checked ? Math.max(current, count) : Math.max(floor, count);
  }
  if (Number(level.value) !== current) level.value = String(current);
}

function groupFor(category) {
  return [...document.querySelectorAll('.mobile-general-group')].find(node => {
    const h = node.querySelector('h3')?.textContent || "";
    return category === "social" ? h.includes("社会") : category === "connection" ? h.includes("コネ") : h.includes("一般技能") && !h.includes("社会");
  });
}

function renderPendingGeneral() {
  document.querySelectorAll('[data-mobile-pending-general]').forEach(node => node.remove());
  for (const item of newSkills.filter(x => !["style","separator"].includes(x._kind || x.category))) {
    const group = groupFor(item.category);
    if (!group) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mobile-pending-general";
    button.dataset.mobilePendingGeneral = item._temp;
    button.innerHTML = `<strong>${esc(item.name || "名称未入力")}</strong><span>LV ${num(item.level)} / ${SUITS.filter(([key]) => item[key]).map(([,mark]) => mark).join("") || "—"}</span>`;
    button.onclick = () => openGeneral(item);
    group.append(button);
  }
}

function styleDetail(item) {
  if (!String(item.description || "").startsWith(STYLE_PREFIX)) return {};
  try { return JSON.parse(String(item.description).slice(STYLE_PREFIX.length).trim()); } catch { return {}; }
}

function styleCard(item) {
  const outline = {"♠":"♤","♣":"♧","♥":"♡","♦":"♢"};
  const suits = SUITS.map(([key,mark]) => item[key] ? mark : outline[mark]).join("");
  return `<button type="button" class="mobile-edit-card is-pending" data-mobile-pending-style="${item._temp}" data-style-order-key="temp:${item._temp}"><span class="mobile-edit-card__top"><span class="mobile-edit-card__name">${esc(item.name || "名称未入力")}</span><span class="mobile-edit-card__level">LV ${num(item.level)}</span></span><span class="mobile-edit-card__meta"><span>未保存</span><span class="mobile-edit-card__suits">${suits}</span></span></button>`;
}

function separatorCard(item, existing = false) {
  const key = existing ? `id:${item.id}` : `temp:${item._temp}`;
  return `<div class="mobile-style-separator" data-style-separator="${esc(key)}" data-style-order-key="${esc(key)}"><span>区切り</span><div><button type="button" data-separator-move="up" aria-label="区切りを上へ">↑</button><button type="button" data-separator-move="down" aria-label="区切りを下へ">↓</button>${existing?"":`<button type="button" data-separator-remove aria-label="区切りを削除">×</button>`}</div></div>`;
}

function renderPendingStyle() {
  document.querySelectorAll('[data-mobile-pending-style],[data-style-separator^="temp:"]').forEach(node => node.remove());
  const root = $("#mobile-style-skills");
  if (!root) return;
  for (const item of newSkills.filter(x => x.category === "style")) {
    root.insertAdjacentHTML("beforeend", item._separator ? separatorCard(item) : styleCard(item));
  }
  decorateExistingStyleOrder();
}

function openNewStyle(item) {
  activeNewStyle = item;
  $("#style-skill-dialog-title").textContent = item.name || "スタイル技能追加";
  $("#mobile-style-name").value = item.name || "";
  $("#mobile-style-kind").value = item.skill_kind || "normal";
  $("#mobile-style-level").value = num(item.level);
  for (const [key] of SUITS) $("#mobile-style-suit-" + key).checked = Boolean(item[key]);
  const detail = styleDetail(item);
  for (const key of DETAIL_FIELDS) {
    const control = document.querySelector(`[data-mobile-style-detail="${key}"]`);
    if (control) control.value = detail[key] || "";
  }
  $("#style-skill-dialog").showModal();
  requestAnimationFrame(() => $("#mobile-style-name")?.focus());
}

function commitNewStyle() {
  const item = activeNewStyle;
  if (!item) return;
  item.name = $("#mobile-style-name").value;
  item.skill_kind = $("#mobile-style-kind").value;
  item.level = Math.max(0, num($("#mobile-style-level").value));
  for (const [key] of SUITS) item[key] = $("#mobile-style-suit-" + key).checked;
  const count = SUITS.reduce((n,[key]) => n + (item[key] ? 1 : 0), 0);
  item.level = Math.max(item.level, count);
  const detail = {};
  for (const key of DETAIL_FIELDS) detail[key] = document.querySelector(`[data-mobile-style-detail="${key}"]`)?.value || "";
  item.description = STYLE_PREFIX + "\n" + JSON.stringify(detail);
  activeNewStyle = null;
  renderPendingStyle();
  markDirty();
}

function installStyleDelete() {
  const dialog = $("#style-skill-dialog");
  if (!dialog || $("#mobile-queued-style-delete")) return;
  const button = document.createElement("button");
  button.id = "mobile-queued-style-delete";
  button.type = "button";
  button.className = "mobile-danger-action";
  button.textContent = "このスタイル技能を削除";
  dialog.querySelector('.mobile-editor-dialog__body')?.append(button);
  button.onclick = () => {
    const id = activeNewStyle?._temp || existingStyleId;
    if (!id) return;
    if (!confirm(`「${$("#mobile-style-name")?.value || "名称未入力"}」を削除しますか？`)) return;
    if (activeNewStyle) {
      const index = newSkills.indexOf(activeNewStyle);
      if (index >= 0) newSkills.splice(index, 1);
      activeNewStyle = null;
    } else {
      deleteSkills.add(String(id));
      document.querySelector(`[data-mobile-style-skill="${CSS.escape(String(id))}"]`)?.remove();
    }
    dialog.close();
    renderPendingStyle();
    markDirty();
  };
}

async function loadStyleRows() {
  if (!character) return;
  const { data, error } = await supabase.from("character_skills").select("id,category,name,description,sort_order").eq("character_id", character.id).eq("category", "style").order("sort_order");
  if (error) { console.error(error); return; }
  styleRows = data || [];
  decorateExistingStyleOrder();
}

function isSeparatorData(item) {
  const text = String(item?.description || "");
  if (text.startsWith(STYLE_SEPARATOR)) return true;
  if (!text.startsWith(STYLE_PREFIX)) return false;
  try { return String(JSON.parse(text.slice(STYLE_PREFIX.length).trim())?.description || "").startsWith(STYLE_SEPARATOR); } catch { return false; }
}

function decorateExistingStyleOrder() {
  const root = $("#mobile-style-skills");
  if (!root || !styleRows.length) return;
  const normalButtons = [...root.querySelectorAll('[data-mobile-style-skill]')];
  normalButtons.forEach(button => button.dataset.styleOrderKey = `id:${button.dataset.mobileStyleSkill}`);
  const separatorData = styleRows.filter(isSeparatorData);
  const rawSeparators = [...root.querySelectorAll('.mobile-readonly-card')].filter(node => !node.dataset.styleSeparatorDecorated);
  rawSeparators.forEach((node, index) => {
    const item = separatorData[index];
    if (!item) return;
    const replacement = document.createElement("div");
    replacement.innerHTML = separatorCard(item, true);
    node.replaceWith(replacement.firstElementChild);
  });
}

function moveSeparator(button, direction) {
  const separator = button.closest('[data-style-separator]');
  const root = $("#mobile-style-skills");
  if (!separator || !root) return;
  const siblings = [...root.children].filter(node => node.matches('[data-style-order-key]'));
  const index = siblings.indexOf(separator);
  const other = direction === "up" ? siblings[index - 1] : siblings[index + 1];
  if (!other) return;
  if (direction === "up") root.insertBefore(separator, other);
  else root.insertBefore(other, separator);
  styleOrderDirty = true;
  markDirty();
}

function removePendingSeparator(button) {
  const separator = button.closest('[data-style-separator^="temp:"]');
  if (!separator) return;
  const temp = separator.dataset.styleSeparator.slice(5);
  const index = newSkills.findIndex(item => item._temp === temp);
  if (index >= 0) newSkills.splice(index, 1);
  separator.remove();
  styleOrderDirty = true;
  markDirty();
}

function styleOrderMap() {
  const root = $("#mobile-style-skills");
  const map = new Map();
  if (!root) return map;
  [...root.children].filter(node => node.matches('[data-style-order-key]')).forEach((node,index) => map.set(node.dataset.styleOrderKey, index * 10));
  return map;
}

function skillPayload(item, orderMap) {
  const order = orderMap.get(item._temp ? `temp:${item._temp}` : `id:${item.id}`);
  return {
    character_id:character.id, category:item.category, name:item.name || "", level:num(item.level),
    free_level:Math.min(num(item.free_level),num(item.level)), skill_kind:item.skill_kind || "proper",
    reason:Boolean(item.reason), passion:Boolean(item.passion), life:Boolean(item.life), mundane:Boolean(item.mundane),
    timing:item.timing || "", target:item.target || "", range:item.range || "", difficulty:item.difficulty || "",
    confrontation:item.confrontation || "", description:item.description || "", sort_order:Number.isFinite(order) ? order : num(item.sort_order)
  };
}

async function flush() {
  const orderMap = styleOrderMap();
  for (const id of deleteSkills) {
    const { error } = await supabase.from("character_skills").delete().eq("id", id).eq("character_id", character.id);
    if (error) throw error;
  }
  for (const item of [...newSkills]) {
    if (!item._separator && !String(item.name || "").trim()) continue;
    const { error } = await supabase.from("character_skills").insert(skillPayload(item, orderMap));
    if (error) throw error;
  }
  if (styleOrderDirty) {
    for (const row of styleRows) {
      if (deleteSkills.has(String(row.id))) continue;
      const order = orderMap.get(`id:${row.id}`);
      if (!Number.isFinite(order) || Number(row.sort_order) === order) continue;
      const { error } = await supabase.from("character_skills").update({sort_order:order}).eq("id", row.id).eq("character_id", character.id);
      if (error) throw error;
    }
  }
  newSkills.length = 0;
  deleteSkills.clear();
  styleOrderDirty = false;
  renderPendingGeneral();
  renderPendingStyle();
}

async function saveCapture(event) {
  if (!event.target.closest?.("#mobile-save") || replaying || saving || !hasQueued() || !character) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  saving = true;
  const button = $("#mobile-save");
  if (button) button.disabled = true;
  try {
    await flush();
    replaying = true;
    if (button) { button.disabled = false; button.click(); }
  } catch (error) {
    console.error(error);
    if (button) button.disabled = false;
    const status = $("#mobile-save-status");
    if (status) { status.dataset.state = "error"; status.textContent = `技能の保存に失敗しました：${error?.message || "不明なエラー"}`; }
  } finally {
    replaying = false;
    saving = false;
  }
}

function add(type) {
  if (type === "separator") {
    const item = skillBlank("style");
    item._separator = true;
    item.skill_kind = "none";
    item.level = 1;
    item.description = STYLE_SEPARATOR;
    newSkills.push(item);
    renderPendingStyle();
    styleOrderDirty = true;
    markDirty();
    return;
  }
  const item = skillBlank(type);
  newSkills.push(item);
  markDirty();
  if (type === "style") { renderPendingStyle(); openNewStyle(item); }
  else { renderPendingGeneral(); openGeneral(item); }
}

function delegates() {
  document.addEventListener("click", event => {
    const addButton = event.target.closest('[data-mobile-queued-add]');
    if (addButton) { add(addButton.dataset.mobileQueuedAdd); return; }
    const pending = event.target.closest('[data-mobile-pending-style]');
    if (pending) {
      const item = newSkills.find(value => value._temp === pending.dataset.mobilePendingStyle);
      if (item) openNewStyle(item);
      return;
    }
    const style = event.target.closest('[data-mobile-style-skill]');
    if (style) existingStyleId = style.dataset.mobileStyleSkill;
    const move = event.target.closest('[data-separator-move]');
    if (move) { event.preventDefault(); moveSeparator(move, move.dataset.separatorMove); return; }
    const remove = event.target.closest('[data-separator-remove]');
    if (remove) { event.preventDefault(); removePendingSeparator(remove); }
  }, true);
  document.addEventListener("tnx:mobile-style-dialog-commit", () => commitNewStyle());
  document.addEventListener("click", saveCapture, true);
}

async function init() {
  installBars();
  installGeneralDialog();
  installStyleDelete();
  delegates();
  user = await requireAuth();
  if (!user) return;
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return;
  const { data } = await supabase.from("characters").select("id").eq("public_id", id).eq("owner_id", user.id).maybeSingle();
  character = data || null;
  enhanceGeneral();
  new MutationObserver(enhanceGeneral).observe($("#mobile-general-skills") || document.body, {childList:true,subtree:true});
  renderPendingGeneral();
  renderPendingStyle();
  await loadStyleRows();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
