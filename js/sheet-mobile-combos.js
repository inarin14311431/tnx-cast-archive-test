import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const SUITS = [["reason","♠理性"],["passion","♣感情"],["life","♥生命"],["mundane","♦外界"]];
const CATS = {general:"一般技能",social:"社会",connection:"コネ",style:"スタイル技能"};
const TIMING_OPTIONS = ["常時","常時（選択）","セットアッププロセス","イニシアチブプロセス","ムーブ","マイナー","メジャー","リアクション","オートアクション","クリンナッププロセス","舞台裏判定","登場判定","判定の直前","判定の直後","ダメージ算出","ダメージ算出の直前","ダメージ適用の直前","ダメージ適用の直後","神業","解説参照","任意","―"];
const TARGET_OPTIONS = ["自身","単体","単体※","範囲","範囲（選択）","シーン","シーン（選択）","チーム","解説参照","なし","―"];
const RANGE_OPTIONS = ["なし","至近","至近※","近","中","遠","超遠","武器","解説参照","―"];

let user = null;
let character = null;
let combos = [];
let skills = [];
let activeId = null;
let mode = "combo";
let replaying = false;
let saving = false;
const dirtyIds = new Set();
const deletedIds = new Set();

const tempId = () => `combo-${crypto.randomUUID()}`;
const positive = v => { const n = parseInt(v, 10); return Number.isInteger(n) && n > 0 ? n : null; };
const splitSkills = v => String(v || "").split(/[＋+]/).map(x => x.trim()).filter(Boolean);

function markDirty() {
  const button = $("#mobile-save");
  if (button) { button.dataset.state = "dirty"; button.textContent = "変更を保存"; }
  const status = $("#mobile-save-status");
  if (status) { status.dataset.state = "dirty"; status.textContent = "未保存の変更があります"; }
}

function injectCss() {
  if (document.querySelector('[data-mobile-combo-style]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./css-next/pages/sheet-mobile-combos.css?v=3";
  link.dataset.mobileComboStyle = "1";
  document.head.append(link);
}

function injectSection() {
  if ($("#mobile-combos-section")) return;
  const outfit = $("#mobile-outfits-section");
  if (!outfit) return;
  const section = document.createElement("section");
  section.id = "mobile-combos-section";
  section.className = "mobile-sheet-section mobile-sheet-section--combos";
  section.innerHTML = `<header><h2>07 コンボ／技能カウンター</h2></header><div class="mobile-sheet-section__body"><div class="mobile-section-addbar mobile-section-addbar--two"><button type="button" class="mobile-section-add" id="mobile-combo-add">＋ コンボ</button><button type="button" class="mobile-section-add" id="mobile-counter-add">＋ 技能カウンター</button></div><div id="mobile-combo-list" class="mobile-combo-list"></div></div>`;
  outfit.after(section);
  const nav = $(".mobile-sheet-nav");
  if (nav && !nav.querySelector('a[href="#mobile-combos-section"]')) {
    const a = document.createElement("a");
    a.href = "#mobile-combos-section";
    a.textContent = "コンボ";
    nav.append(a);
  }
}

function injectDialog() {
  if ($("#mobile-combo-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "mobile-combo-dialog";
  dialog.className = "mobile-editor-dialog mobile-combo-dialog";
  dialog.innerHTML = `<form id="mobile-combo-form"><header class="mobile-editor-dialog__header mobile-editor-dialog__header--close-only"><button type="button" id="mobile-combo-close">閉じる</button><strong id="mobile-combo-title">コンボ編集</strong></header><div class="mobile-editor-dialog__body"><div id="mobile-combo-fields"></div><button type="button" id="mobile-combo-delete" class="mobile-danger-action">この登録を削除</button><p id="mobile-combo-message" class="mobile-combo-message" aria-live="polite"></p></div></form>`;
  document.body.append(dialog);
}

function limitOptions(current = "") {
  const value = positive(current);
  return `<option value="">なし</option>${Array.from({length:10},(_,i)=>i+1).map(n => `<option value="${n}" ${value===n?"selected":""}>${n}回</option>`).join("")}`;
}

function selectOptions(options, current = "") {
  const value = String(current || "");
  return `<option value="">選択</option>${options.map(item => `<option value="${esc(item)}" ${value===item?"selected":""}>${esc(item)}</option>`).join("")}`;
}

function isCounter(item) {
  return item?._mode === "counter" || (String(item?.name || "").trim() && String(item?.name || "").trim() === String(item?.skills || "").trim() && positive(item?.act_use_limit) && [item.ability,item.modifier,item.target_value,item.timing,item.target,item.range,item.description].every(v => !String(v ?? "").trim()));
}

function abilityText(v) {
  const keys = String(v || "").toLowerCase().split(/[\s,|/+]+/).filter(Boolean);
  return keys.map(k => SUITS.find(([key]) => key === k)?.[1]).filter(Boolean).join("・");
}

function render() {
  const root = $("#mobile-combo-list");
  if (!root) return;
  const visible = combos.filter(x => !deletedIds.has(String(x.id)));
  if (!visible.length) { root.innerHTML = '<p class="mobile-sheet-section__note">登録なし</p>'; return; }
  root.innerHTML = visible.map(item => {
    const counter = isCounter(item);
    const dirty = item._new || dirtyIds.has(String(item.id));
    const details = counter
      ? [positive(item.act_use_limit) ? `使用上限 ${positive(item.act_use_limit)}回` : ""]
      : [abilityText(item.ability), item.modifier !== "" && item.modifier != null ? `修正 ${item.modifier}` : "", item.target_value ? `目安 ${item.target_value}` : "", positive(item.act_use_limit) ? `使用上限 ${positive(item.act_use_limit)}回` : ""].filter(Boolean);
    return `<button type="button" class="mobile-combo-card${counter?" is-counter":""}${dirty?" is-pending":""}" data-mobile-combo-id="${esc(item.id)}"><span>${counter?"COUNTER":"COMBO"}${dirty?" / 未保存":""}</span><strong>${esc(item.name||"名称未登録")}</strong><small>${esc(counter?(details.join(" / ")||"詳細未登録"):(item.skills||"組み合わせ技能なし"))}</small>${counter?"":`<em>${esc(details.join(" / ")||"詳細未登録")}</em>`}</button>`;
  }).join("");
}

function skillGroups(selected) {
  const set = new Set(splitSkills(selected));
  return Object.entries(CATS).map(([cat,label]) => {
    const list = skills.filter(x => x.category === cat);
    if (!list.length) return "";
    return `<fieldset class="mobile-combo-skill-group"><legend>${label}</legend>${list.map(x => `<label><input type="checkbox" data-mobile-combo-skill="${esc(x.name)}" ${set.has(x.name)?"checked":""}><span>${esc(x.name)}</span></label>`).join("")}</fieldset>`;
  }).join("");
}

function comboEditor(item = {}) {
  const selected = new Set(String(item.ability || "").split(/[\s,|/+]+/));
  return `<div class="mobile-combo-grid"><label class="mobile-span-2">名称<input id="mobile-combo-name" value="${esc(item.name||"")}"></label><section class="mobile-span-2"><span class="mobile-combo-field-label">使用スート</span><div class="mobile-combo-suits">${SUITS.map(([k,l])=>`<label><input type="checkbox" data-mobile-combo-suit="${k}" ${selected.has(k)?"checked":""}><span>${l}</span></label>`).join("")}</div></section><label class="mobile-span-2">組み合わせ技能<input id="mobile-combo-skills" value="${esc(item.skills||"")}"></label><div class="mobile-span-2 mobile-combo-skill-picker">${skillGroups(item.skills||"")}</div><label>修正<input id="mobile-combo-mod" type="number" step="1" inputmode="numeric" value="${esc(item.modifier??"")}"></label><label>目安<input id="mobile-combo-target-value" value="${esc(item.target_value||"")}"></label><label>タイミング<select id="mobile-combo-timing">${selectOptions(TIMING_OPTIONS,item.timing)}</select></label><label>対象<select id="mobile-combo-target">${selectOptions(TARGET_OPTIONS,item.target)}</select></label><label>射程<select id="mobile-combo-range">${selectOptions(RANGE_OPTIONS,item.range)}</select></label><label>使用上限<select id="mobile-combo-limit">${limitOptions(item.act_use_limit)}</select></label><label class="mobile-span-2">解説<textarea id="mobile-combo-description" rows="6">${esc(item.description||"")}</textarea></label></div>`;
}

function counterEditor(item = {}) {
  const current = String(item.skills || item.name || "");
  const style = skills.filter(s => s.category === "style");
  if (current && !style.some(s => s.name === current)) style.push({name:current,level:0});
  return `<div class="mobile-combo-grid"><label class="mobile-span-2">スタイル技能<select id="mobile-counter-skill"><option value="">選択</option>${style.map(s=>`<option value="${esc(s.name)}" ${s.name===current?"selected":""}>${esc(s.name)} / LV${s.level}</option>`).join("")}</select></label><label class="mobile-span-2">使用上限<select id="mobile-counter-limit">${limitOptions(item.act_use_limit)}</select></label></div>`;
}

function openEditor(nextMode, item = null) {
  mode = nextMode;
  if (!item) {
    item = {_new:true,id:tempId(),_mode:nextMode,name:"",skills:"",ability:"",modifier:"",target_value:"",timing:"",target:"",range:"",act_use_limit:null,description:"",sort_order:nextSort()};
    combos.push(item);
    dirtyIds.add(String(item.id));
    markDirty();
  }
  activeId = String(item.id);
  $("#mobile-combo-title").textContent = item._new ? (mode === "counter" ? "技能カウンターを追加" : "コンボを追加") : (mode === "counter" ? "技能カウンターを編集" : "コンボを編集");
  $("#mobile-combo-fields").innerHTML = mode === "counter" ? counterEditor(item) : comboEditor(item);
  $("#mobile-combo-delete").hidden = false;
  $("#mobile-combo-message").textContent = "";
  $("#mobile-combo-dialog").showModal();
  requestAnimationFrame(() => $(mode === "counter" ? "#mobile-counter-skill" : "#mobile-combo-name")?.focus());
  render();
}

function applyEditorToActive() {
  const item = combos.find(x => String(x.id) === String(activeId));
  if (!item) return;
  if (mode === "counter") {
    const skill = $("#mobile-counter-skill")?.value || "";
    item._mode = "counter";
    item.name = skill;
    item.skills = skill;
    item.ability = "";
    item.modifier = "";
    item.target_value = "";
    item.timing = "";
    item.target = "";
    item.range = "";
    item.act_use_limit = positive($("#mobile-counter-limit")?.value);
    item.description = "";
  } else {
    item._mode = "combo";
    item.name = $("#mobile-combo-name")?.value.trim() || "";
    item.skills = $("#mobile-combo-skills")?.value.trim() || "";
    item.ability = [...document.querySelectorAll('[data-mobile-combo-suit]:checked')].map(x => x.dataset.mobileComboSuit).join(",");
    item.modifier = $("#mobile-combo-mod")?.value.trim() || "";
    item.target_value = $("#mobile-combo-target-value")?.value.trim() || "";
    item.timing = $("#mobile-combo-timing")?.value || "";
    item.target = $("#mobile-combo-target")?.value || "";
    item.range = $("#mobile-combo-range")?.value || "";
    item.act_use_limit = positive($("#mobile-combo-limit")?.value);
    item.description = $("#mobile-combo-description")?.value || "";
  }
  dirtyIds.add(String(item.id));
  markDirty();
  render();
}

function closeEditor() {
  applyEditorToActive();
  activeId = null;
  $("#mobile-combo-dialog")?.close();
}

function removeActive() {
  const item = combos.find(x => String(x.id) === String(activeId));
  if (!item) return;
  if (!confirm(`「${item.name || "名称未入力"}」を削除しますか？`)) return;
  if (item._new) combos = combos.filter(x => String(x.id) !== String(item.id));
  else deletedIds.add(String(item.id));
  dirtyIds.delete(String(item.id));
  activeId = null;
  $("#mobile-combo-dialog")?.close();
  markDirty();
  render();
}

function bindPicker() {
  const fields = $("#mobile-combo-fields");
  fields.addEventListener("change", e => {
    const box = e.target.closest('[data-mobile-combo-skill]');
    if (!box) return;
    const input = $("#mobile-combo-skills");
    const names = splitSkills(input.value);
    const index = names.indexOf(box.dataset.mobileComboSkill);
    if (box.checked && index < 0) names.push(box.dataset.mobileComboSkill);
    if (!box.checked && index >= 0) names.splice(index, 1);
    input.value = names.join("＋");
  });
  fields.addEventListener("input", e => {
    if (e.target.id !== "mobile-combo-skills") return;
    const set = new Set(splitSkills(e.target.value));
    fields.querySelectorAll('[data-mobile-combo-skill]').forEach(b => b.checked = set.has(b.dataset.mobileComboSkill));
  });
}

function nextSort() {
  return combos.length ? Math.max(...combos.map(x => Number(x.sort_order || 0))) + 1 : 0;
}

function dbPayload(item) {
  if (isCounter(item)) {
    if (!item.name || !positive(item.act_use_limit)) throw new Error("技能カウンターはスタイル技能と使用上限を指定してください。");
    return {character_id:character.id,name:item.name,skills:item.name,ability:"",modifier:"",target_value:"",timing:"",target:"",range:"",act_use_limit:positive(item.act_use_limit),description:"",sort_order:Number(item.sort_order||0)};
  }
  if (!item.name || !item.skills) throw new Error("コンボ名と組み合わせ技能を入力してください。");
  return {character_id:character.id,name:item.name,skills:item.skills,ability:item.ability||"",modifier:item.modifier||"",target_value:item.target_value||"",timing:item.timing||"",target:item.target||"",range:item.range||"",act_use_limit:positive(item.act_use_limit),description:item.description||"",sort_order:Number(item.sort_order||0)};
}

async function flush() {
  for (const id of deletedIds) {
    const { error } = await supabase.from("character_combos").delete().eq("id", id).eq("character_id", character.id);
    if (error) throw error;
  }
  for (const item of combos) {
    if (deletedIds.has(String(item.id)) || !dirtyIds.has(String(item.id))) continue;
    const payload = dbPayload(item);
    if (item._new) {
      const { data, error } = await supabase.from("character_combos").insert(payload).select("*").single();
      if (error) throw error;
      Object.assign(item, data, {_new:false});
    } else {
      const { error } = await supabase.from("character_combos").update(payload).eq("id", item.id).eq("character_id", character.id);
      if (error) throw error;
    }
  }
  combos = combos.filter(x => !deletedIds.has(String(x.id)));
  dirtyIds.clear();
  deletedIds.clear();
  render();
}

async function interceptGlobalSave(event) {
  if (!event.target.closest?.("#mobile-save") || replaying || saving || (!dirtyIds.size && !deletedIds.size) || !character) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  saving = true;
  const button = $("#mobile-save");
  if (button) button.disabled = true;
  try {
    if (activeId) applyEditorToActive();
    await flush();
    replaying = true;
    if (button) { button.disabled = false; button.click(); }
  } catch (error) {
    console.error(error);
    if (button) button.disabled = false;
    const status = $("#mobile-save-status");
    if (status) { status.dataset.state = "error"; status.textContent = `コンボの保存に失敗しました：${error?.message || "不明なエラー"}`; }
  } finally {
    replaying = false;
    saving = false;
  }
}

async function load() {
  if (!character) return;
  const [cr, sr] = await Promise.all([
    supabase.from("character_combos").select("*").eq("character_id", character.id).order("sort_order").order("name"),
    supabase.from("character_skills").select("category,name,level,skill_kind,sort_order").eq("character_id", character.id).order("sort_order")
  ]);
  combos = cr.error ? [] : (cr.data || []).map(x => ({...x,_mode:isCounter(x)?"counter":"combo"}));
  if (cr.error) console.error(cr.error);
  if (sr.error) { console.error(sr.error); skills = []; }
  else {
    const seen = new Set();
    skills = (sr.data || []).map(x => ({...x,name:String(x.name||"").trim(),level:Number(x.level||0)})).filter(x => x.name && x.level > 0 && CATS[x.category] && !(x.category === "style" && x.skill_kind === "none")).filter(x => { const k = x.category + "\0" + x.name; if (seen.has(k)) return false; seen.add(k); return true; });
  }
  render();
}

function bind() {
  $("#mobile-combo-add").onclick = () => openEditor("combo");
  $("#mobile-counter-add").onclick = () => openEditor("counter");
  $("#mobile-combo-close").onclick = closeEditor;
  $("#mobile-combo-dialog").addEventListener("cancel", event => { event.preventDefault(); closeEditor(); });
  $("#mobile-combo-delete").onclick = removeActive;
  $("#mobile-combo-list").addEventListener("click", e => {
    const button = e.target.closest('[data-mobile-combo-id]');
    if (!button) return;
    const item = combos.find(v => String(v.id) === button.dataset.mobileComboId);
    if (item) openEditor(isCounter(item) ? "counter" : "combo", item);
  });
  bindPicker();
  document.addEventListener("click", interceptGlobalSave, true);
}

async function init() {
  injectCss();
  injectSection();
  injectDialog();
  bind();
  user = await requireAuth();
  if (!user) return;
  const publicId = new URLSearchParams(location.search).get("id");
  if (!publicId) return;
  const { data, error } = await supabase.from("characters").select("id").eq("public_id", publicId).eq("owner_id", user.id).maybeSingle();
  if (error || !data) { if (error) console.error(error); return; }
  character = data;
  await load();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
