import { supabase } from "./supabase-client.js";
import { getMobileEditorContext } from "./sheet-mobile-runtime.js?v=1";
import {
  LABELS,
  blankOutfit,
  cloneOutfit,
  collectOutfitRecord,
  composeConcealment,
  composeDefense,
  parseConcealment,
  parseDefense,
  normalizeNumber
} from "./sheet-mobile-outfit-model.js?v=3";
import {
  buildOutfitEditor,
  ensureOutfitDialog,
  ensureOutfitStylesheet,
  ensureOutfitToolbar,
  renderOutfitCards
} from "./sheet-mobile-outfit-ui.js?v=7";

const $ = selector => document.querySelector(selector);

let character = null;
let outfits = [];
let activeId = "";
let activeDraft = null;
const dirtyIds = new Set();
const deletedIds = new Set();

function render() {
  renderOutfitCards({ root: $("#mobile-outfits"), outfits, deletedIds, dirtyIds });
}

function markDirty() {
  const button = $("#mobile-save");
  if (button) {
    button.dataset.state = "dirty";
    button.textContent = "変更を保存";
  }
  const status = $("#mobile-save-status");
  if (status) {
    status.dataset.state = "dirty";
    status.textContent = "未保存の変更があります";
  }
}

function hasChanges() {
  return dirtyIds.size > 0 || deletedIds.size > 0;
}

function openEditor(id) {
  const item = outfits.find(row => String(row.id) === String(id));
  if (!item) return;
  activeId = String(item.id);
  activeDraft = cloneOutfit(item);
  renderEditor();
  const dialog = $("#mobile-outfit-dialog");
  if (!dialog?.open) dialog?.showModal();
  requestAnimationFrame(() => $("#mobile-outfit-fields [data-outfit-field=\"category\"]")?.focus());
}

function renderEditor() {
  if (!activeDraft) return;
  const title = $("#mobile-outfit-title");
  if (title) title.textContent = activeDraft.name || (activeDraft._new ? "アウトフィット追加" : "アウトフィット編集");
  const root = $("#mobile-outfit-fields");
  if (root) root.innerHTML = buildOutfitEditor(activeDraft);
}

function addOutfit() {
  const item = blankOutfit();
  outfits.push(item);
  dirtyIds.add(String(item.id));
  markDirty();
  render();
  openEditor(item.id);
}

function updateDraft(control) {
  if (!activeDraft) return;
  const field = control.dataset.outfitField;
  const detail = control.dataset.outfitDetail;
  const transient = control.dataset.outfitTransient;

  if (transient === "conceal-value") activeDraft._concealValue = control.value;
  else if (transient === "conceal-mod") activeDraft._concealMod = control.value;
  else if (transient === "def-s") activeDraft._defS = control.value;
  else if (transient === "def-p") activeDraft._defP = control.value;
  else if (transient === "def-i") activeDraft._defI = control.value;
  else if (detail) activeDraft.ofc_details[detail] = control.value;
  else if (field) {
    activeDraft[field] = control.type === "number" || field === "control_modifier"
      ? normalizeNumber(control.value)
      : control.value;
    if (field === "control_modifier") activeDraft.ofc_details.control_value = String(activeDraft.control_modifier);
  }

  activeDraft.concealment = composeConcealment(activeDraft);
  activeDraft.defense = composeDefense(activeDraft);

  if (field === "category") renderEditor();
  if (field === "name") {
    const title = $("#mobile-outfit-title");
    if (title) title.textContent = activeDraft.name || (activeDraft._new ? "アウトフィット追加" : "アウトフィット編集");
  }
}

function commitDraft() {
  const item = outfits.find(row => String(row.id) === String(activeId));
  if (!item || !activeDraft) return;
  const before = JSON.stringify(collectOutfitRecord(item, character));
  const meta = { _new: item._new, id: item.id };
  Object.assign(item, activeDraft, meta);
  if (before !== JSON.stringify(collectOutfitRecord(item, character)) || item._new) {
    dirtyIds.add(String(item.id));
    markDirty();
  }
  render();
}

function closeEditor() {
  commitDraft();
  activeId = "";
  activeDraft = null;
  $("#mobile-outfit-dialog")?.close();
}

function stageDelete() {
  const item = outfits.find(row => String(row.id) === String(activeId));
  if (!item) return;
  const label = activeDraft?.name || item.name || "名称未入力";
  if (!confirm(`「${label}」を削除しますか？`)) return;
  if (item._new) outfits = outfits.filter(row => String(row.id) !== String(item.id));
  else deletedIds.add(String(item.id));
  dirtyIds.delete(String(item.id));
  activeId = "";
  activeDraft = null;
  $("#mobile-outfit-dialog")?.close();
  markDirty();
  render();
}

async function flush() {
  if (!character) return;
  for (const id of deletedIds) {
    const { error } = await supabase.from("character_outfits").delete().eq("id", id).eq("character_id", character.id);
    if (error) throw error;
  }

  for (const item of outfits) {
    if (deletedIds.has(String(item.id)) || !dirtyIds.has(String(item.id))) continue;
    if (item._new && (!item.category || !String(item.name || "").trim())) {
      throw new Error("追加したアウトフィットは分類と名称を入力してください。");
    }
    const data = collectOutfitRecord(item, character);
    if (item._new) {
      const result = await supabase.from("character_outfits").insert(data).select("*").single();
      if (result.error) throw result.error;
      Object.assign(item, cloneOutfit({ ...result.data, _new: false }));
    } else {
      const { error } = await supabase.from("character_outfits").update(data).eq("id", item.id).eq("character_id", character.id);
      if (error) throw error;
    }
  }

  outfits = outfits.filter(item => !deletedIds.has(String(item.id)));
  dirtyIds.clear();
  deletedIds.clear();
  render();
}

function bindEvents() {
  $("#mobile-outfit-add")?.addEventListener("click", addOutfit);
  $("#mobile-outfits")?.addEventListener("click", event => {
    const button = event.target.closest("[data-mobile-outfit]");
    if (button) openEditor(button.dataset.mobileOutfit);
  });
  $("#mobile-outfit-close")?.addEventListener("click", closeEditor);
  $("#mobile-outfit-dialog")?.addEventListener("cancel", event => {
    event.preventDefault();
    closeEditor();
  });
  $("#mobile-outfit-fields")?.addEventListener("input", event => {
    const control = event.target.closest("[data-outfit-field],[data-outfit-detail],[data-outfit-transient]");
    if (control) updateDraft(control);
  });
  $("#mobile-outfit-fields")?.addEventListener("change", event => {
    const control = event.target.closest("[data-outfit-field],[data-outfit-detail],[data-outfit-transient]");
    if (control) updateDraft(control);
  });
  $("#mobile-outfit-fields")?.addEventListener("click", event => {
    if (event.target.closest("[data-outfit-delete]")) stageDelete();
  });
  document.addEventListener("tnx:mobile-before-save", event => {
    if (hasChanges()) event.detail.add(flush());
  });
  window.addEventListener("beforeunload", event => {
    if (!hasChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

async function init() {
  ensureOutfitStylesheet();
  ensureOutfitToolbar();
  ensureOutfitDialog();
  bindEvents();
  try {
    const context = await getMobileEditorContext();
    if (!context.character) return;
    character = context.character;
    const rows = await supabase.from("character_outfits").select("*").eq("character_id", character.id).order("sort_order");
    if (rows.error) throw rows.error;
    outfits = (rows.data || []).map(item => cloneOutfit({ ...item, _new: false }));
    render();
  } catch (error) {
    console.error(error);
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();

export { hasChanges, flush, parseConcealment, parseDefense, LABELS };
