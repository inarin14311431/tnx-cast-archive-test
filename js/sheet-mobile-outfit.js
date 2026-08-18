import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const num = value => Number(value || 0);
const LABELS = {weapon:"武器",armor:"防具",cyberware:"サイバーウェア",tron:"トロン",vehicle:"ヴィークル",residence:"住居",other:"その他"};
const RANGE_OPTIONS = ["","なし","至近","至近※","近","中","遠","超遠","武器","解説参照","―"];
const SLOT_OPTIONS = ["","片手持ち","両手持ち","籠手","靴","指","片腕","両腕","片脚","両脚","頭部","眼部","口腔","頭髪","皮膚","骨格","筋肉","IANUS","大脳","小脳","表層意識","深層意識","無意識","タップ","電脳","操縦","ヴィークル","アンダーウェア","スーツ","コート","アーマー","ヘルメット","マスク","ゴーグル","全身","義体","住宅","住宅施設","護符","独立","任意","解説参照","―"];
const CONTROL_OPTIONS = [-5,-4,-3,-2,-1,0,1,2,3,4,5];

let user = null;
let character = null;
let outfits = [];
let activeId = "";
const dirtyIds = new Set();
const deletedIds = new Set();
const tempId = () => `outfit-${crypto.randomUUID()}`;

function ensureCss() {
  let link = document.querySelector('link[data-mobile-outfit-style]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.mobileOutfitStyle = '1';
    document.head.append(link);
  }
  link.href = './css-next/pages/sheet-mobile-outfit.css?v=4';
}
function injectToolbar() {
  const body = $("#mobile-outfits-section .mobile-sheet-section__body");
  if (!body || body.querySelector('[data-mobile-outfit-toolbar]')) return;
  const bar = document.createElement("div");
  bar.className = "mobile-section-addbar";
  bar.dataset.mobileOutfitToolbar = "1";
  bar.innerHTML = '<button type="button" class="mobile-section-add" id="mobile-outfit-add">＋ アウトフィット</button>';
  body.prepend(bar);
}
function injectDialog() {
  if ($('#mobile-outfit-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'mobile-outfit-dialog';
  dialog.className = 'mobile-editor-dialog';
  dialog.innerHTML = `<form method="dialog"><header class="mobile-editor-dialog__header mobile-editor-dialog__header--close-only"><button id="mobile-outfit-close" type="button">閉じる</button><strong id="mobile-outfit-title">アウトフィット編集</strong></header><div class="mobile-editor-dialog__body"><div id="mobile-outfit-fields" class="mobile-outfit-editor"></div></div></form>`;
  document.body.append(dialog);
}
function blankOutfit() {
  return {_new:true,id:tempId(),category:"",name:"",purchase_value:"",experience_cost:0,concealment:"",attack:"",defense:"",range:"",slot:"",description:"",control_modifier:0,cs_modifier:0,mundane_modifier:0,sort_order:9999,_concealValue:"",_concealMod:"",_defS:"",_defP:"",_defI:""};
}
function parseConceal(item) {
  if (item._concealParsed) return;
  const text = String(item.concealment || "").trim();
  const match = text.match(/^\s*([^/（）()]+?)\s*(?:[／/]\s*([+-]?\d+)|[（(]\s*([+-]?\d+)\s*[）)])?\s*$/);
  item._concealValue = match ? String(match[1] || "").trim() : text;
  item._concealMod = match ? String(match[2] || match[3] || "").trim() : "";
  item._concealParsed = true;
}
function composeConceal(item) {
  const value = String(item._concealValue ?? "").trim();
  const mod = String(item._concealMod ?? "").trim();
  return [value, mod].filter(Boolean).join("/");
}
function parseDefense(item) {
  if (item._defParsed) return;
  const text = String(item.defense || "").trim();
  let match = text.match(/S\s*([+-]?\d+)\s*[\/／, ]+P\s*([+-]?\d+)\s*[\/／, ]+I\s*([+-]?\d+)/i);
  if (!match) match = text.match(/^\s*([+-]?\d+)\s*[\/／,]\s*([+-]?\d+)\s*[\/／,]\s*([+-]?\d+)\s*$/);
  item._defS = match ? match[1] : "";
  item._defP = match ? match[2] : "";
  item._defI = match ? match[3] : "";
  item._defParsed = true;
}
function composeDefense(item) {
  const s = String(item._defS ?? "").trim();
  const p = String(item._defP ?? "").trim();
  const i = String(item._defI ?? "").trim();
  if (!s && !p && !i) return "";
  return `S ${s || 0} / P ${p || 0} / I ${i || 0}`;
}
function markDirty() {
  const button = $('#mobile-save');
  if (button) { button.dataset.state = 'dirty'; button.textContent = '変更を保存'; }
  const status = $('#mobile-save-status');
  if (status) { status.dataset.state = 'dirty'; status.textContent = '未保存の変更があります'; }
}
function hasChanges() { return dirtyIds.size > 0 || deletedIds.size > 0; }
function render() {
  const root = $('#mobile-outfits');
  if (!root) return;
  const visible = outfits.filter(item => !deletedIds.has(String(item.id)));
  root.innerHTML = visible.length ? visible.map(item => `<button type="button" class="mobile-outfit-card${item._new || dirtyIds.has(String(item.id)) ? ' is-pending' : ''}" data-mobile-outfit="${esc(item.id)}"><strong>${esc(item.name || '名称未入力')}</strong><span>${esc(LABELS[item.category] || '分類未選択')}</span><small>常備化 ${num(item.experience_cost)}${item._new || dirtyIds.has(String(item.id)) ? ' / 未保存' : ''}</small></button>`).join('') : '<p class="mobile-sheet-section__note">登録なし</p>';
}
function optionList(values, current = "") {
  const set = [...values];
  if (current && !set.includes(current)) set.push(current);
  return set.map(value => `<option value="${esc(value)}" ${String(value)===String(current)?'selected':''}>${value ? esc(value) : '選択'}</option>`).join('');
}
function controlOptions(current) {
  return CONTROL_OPTIONS.map(value => `<option value="${value}" ${Number(current)===value?'selected':''}>${value > 0 ? '+' : ''}${value}</option>`).join('');
}
function commonFields(item) {
  return `<label class="mobile-outfit-editor__name">名称<input data-outfit-field="name" value="${esc(item.name || '')}"></label><label>購入<input data-outfit-field="purchase_value" type="number" step="1" inputmode="numeric" value="${esc(item.purchase_value ?? '')}"></label><label>常備化<input data-outfit-field="experience_cost" type="number" step="1" min="0" inputmode="numeric" value="${esc(item.experience_cost ?? 0)}"></label>`;
}
function concealFields(item) {
  parseConceal(item);
  return `<label>隠匿値<input data-outfit-transient="conceal-value" value="${esc(item._concealValue || '')}"></label><label>隠匿修正<input data-outfit-transient="conceal-mod" type="number" step="1" inputmode="numeric" value="${esc(item._concealMod || '')}"></label>`;
}
function defenseFields(item) {
  parseDefense(item);
  return `<div class="mobile-outfit-defense mobile-span-2"><span>防御値</span><label>S<input data-outfit-transient="def-s" type="number" step="1" inputmode="numeric" value="${esc(item._defS || '')}"></label><label>P<input data-outfit-transient="def-p" type="number" step="1" inputmode="numeric" value="${esc(item._defP || '')}"></label><label>I<input data-outfit-transient="def-i" type="number" step="1" inputmode="numeric" value="${esc(item._defI || '')}"></label></div>`;
}
function slotField(item) { return `<label>部位<select data-outfit-field="slot">${optionList(SLOT_OPTIONS,item.slot || '')}</select></label>`; }
function rangeField(item) { return `<label>射程<select data-outfit-field="range">${optionList(RANGE_OPTIONS,item.range || '')}</select></label>`; }
function controlField(item) { return `<label>制御<select data-outfit-field="control_modifier">${controlOptions(item.control_modifier)}</select></label>`; }
function categoryFields(item) {
  switch (item.category) {
    case 'weapon': return `${concealFields(item)}<label>攻撃<input data-outfit-field="attack" value="${esc(item.attack || '')}"></label>${rangeField(item)}${slotField(item)}`;
    case 'armor': return `${concealFields(item)}${defenseFields(item)}${slotField(item)}${controlField(item)}`;
    case 'vehicle': return `<label>攻撃<input data-outfit-field="attack" value="${esc(item.attack || '')}"></label>${defenseFields(item)}${controlField(item)}<label>CS<input data-outfit-field="cs_modifier" type="number" step="1" inputmode="numeric" value="${esc(item.cs_modifier ?? 0)}"></label>${slotField(item)}`;
    case 'residence': return `<label>外界<input data-outfit-field="mundane_modifier" type="number" step="1" inputmode="numeric" value="${esc(item.mundane_modifier ?? 0)}"></label>${slotField(item)}`;
    case 'cyberware':
    case 'tron':
    case 'other': return `${concealFields(item)}${slotField(item)}${controlField(item)}<label>CS<input data-outfit-field="cs_modifier" type="number" step="1" inputmode="numeric" value="${esc(item.cs_modifier ?? 0)}"></label><label>外界<input data-outfit-field="mundane_modifier" type="number" step="1" inputmode="numeric" value="${esc(item.mundane_modifier ?? 0)}"></label>`;
    default: return '<p class="mobile-outfit-category-hint mobile-span-2">まず分類を選択してください。分類に応じた入力項目を表示します。</p>';
  }
}
function buildEditor(item) {
  const categories = `<option value="">分類を選択</option>${Object.entries(LABELS).map(([value,label]) => `<option value="${value}" ${item.category===value?'selected':''}>${label}</option>`).join('')}`;
  return `<div class="mobile-outfit-editor__grid"><label class="mobile-outfit-editor__category">分類<select data-outfit-field="category">${categories}</select></label>${item.category ? `${commonFields(item)}${categoryFields(item)}<label class="mobile-outfit-editor__description">解説<textarea rows="7" data-outfit-field="description">${esc(item.description || '')}</textarea></label><button type="button" class="mobile-danger-action mobile-outfit-editor__description" data-outfit-delete>このアウトフィットを削除</button>` : categoryFields(item)}</div>`;
}
function open(id) {
  const item = outfits.find(row => String(row.id) === String(id));
  if (!item) return;
  activeId = String(item.id);
  $('#mobile-outfit-title').textContent = item.name || (item._new ? 'アウトフィット追加' : 'アウトフィット編集');
  $('#mobile-outfit-fields').innerHTML = buildEditor(item);
  const dialog = $('#mobile-outfit-dialog');
  if (!dialog?.open) dialog?.showModal();
  requestAnimationFrame(() => $('#mobile-outfit-fields [data-outfit-field="category"]')?.focus());
}
function add() {
  const item = blankOutfit();
  outfits.push(item);
  dirtyIds.add(String(item.id));
  markDirty();
  render();
  open(item.id);
}
function updateActive(control) {
  const item = outfits.find(row => String(row.id) === String(activeId));
  if (!item) return;
  const field = control.dataset.outfitField;
  const transient = control.dataset.outfitTransient;
  if (transient === 'conceal-value') item._concealValue = control.value;
  else if (transient === 'conceal-mod') item._concealMod = control.value;
  else if (transient === 'def-s') item._defS = control.value;
  else if (transient === 'def-p') item._defP = control.value;
  else if (transient === 'def-i') item._defI = control.value;
  else if (field) item[field] = control.type === 'number' || field === 'control_modifier' ? num(control.value) : control.value;
  item.concealment = composeConceal(item);
  item.defense = composeDefense(item);
  dirtyIds.add(String(item.id));
  markDirty();
  if (field === 'category') $('#mobile-outfit-fields').innerHTML = buildEditor(item);
  if (field === 'name') $('#mobile-outfit-title').textContent = item.name || (item._new ? 'アウトフィット追加' : 'アウトフィット編集');
  render();
}
function stageDelete() {
  const item = outfits.find(row => String(row.id) === String(activeId));
  if (!item) return;
  if (!confirm(`「${item.name || '名称未入力'}」を削除しますか？`)) return;
  if (item._new) outfits = outfits.filter(row => String(row.id) !== String(item.id));
  else deletedIds.add(String(item.id));
  dirtyIds.delete(String(item.id));
  activeId = "";
  $('#mobile-outfit-dialog')?.close();
  markDirty();
  render();
}
function collect(item) {
  return {character_id:character.id,category:item.category || 'other',name:item.name || '',purchase_value:String(item.purchase_value ?? ''),experience_cost:num(item.experience_cost),concealment:composeConceal(item),attack:item.attack || '',defense:composeDefense(item),range:item.range || '',slot:item.slot || '',description:item.description || '',control_modifier:num(item.control_modifier),cs_modifier:num(item.cs_modifier),mundane_modifier:num(item.mundane_modifier),sort_order:num(item.sort_order)};
}
async function flush() {
  if (!character) return;
  for (const id of deletedIds) {
    const { error } = await supabase.from('character_outfits').delete().eq('id', id).eq('character_id', character.id);
    if (error) throw error;
  }
  for (const item of outfits) {
    if (deletedIds.has(String(item.id)) || !dirtyIds.has(String(item.id))) continue;
    if (item._new && (!item.category || !String(item.name || '').trim())) throw new Error('追加したアウトフィットは分類と名称を入力してください。');
    const data = collect(item);
    if (item._new) {
      const result = await supabase.from('character_outfits').insert(data).select('*').single();
      if (result.error) throw result.error;
      Object.assign(item,result.data,{_new:false});
      parseConceal(item); parseDefense(item);
    } else {
      const { error } = await supabase.from('character_outfits').update(data).eq('id',item.id).eq('character_id',character.id);
      if (error) throw error;
    }
  }
  outfits = outfits.filter(item => !deletedIds.has(String(item.id)));
  dirtyIds.clear();
  deletedIds.clear();
  render();
}
function bind() {
  $('#mobile-outfit-add')?.addEventListener('click',add);
  $('#mobile-outfits')?.addEventListener('click',event => {
    const button = event.target.closest('[data-mobile-outfit]');
    if (button) open(button.dataset.mobileOutfit);
  });
  $('#mobile-outfit-close')?.addEventListener('click',() => { activeId=""; $('#mobile-outfit-dialog')?.close(); });
  $('#mobile-outfit-dialog')?.addEventListener('cancel',event => { event.preventDefault(); activeId=""; $('#mobile-outfit-dialog')?.close(); });
  $('#mobile-outfit-fields')?.addEventListener('input',event => { const control=event.target.closest('[data-outfit-field],[data-outfit-transient]'); if(control) updateActive(control); });
  $('#mobile-outfit-fields')?.addEventListener('change',event => { const control=event.target.closest('[data-outfit-field],[data-outfit-transient]'); if(control) updateActive(control); });
  $('#mobile-outfit-fields')?.addEventListener('click',event => { if(event.target.closest('[data-outfit-delete]')) stageDelete(); });
  document.addEventListener('tnx:mobile-before-save',event => { if(hasChanges()) event.detail.add(flush()); });
  window.addEventListener('beforeunload',event => { if(!hasChanges()) return; event.preventDefault(); event.returnValue=''; });
}
async function init() {
  ensureCss(); injectToolbar(); injectDialog(); bind();
  user = await requireAuth();
  if (!user) return;
  const publicId = new URLSearchParams(location.search).get('id');
  if (!publicId) return;
  const result = await supabase.from('characters').select('id').eq('public_id',publicId).eq('owner_id',user.id).maybeSingle();
  if (result.error || !result.data) { if(result.error) console.error(result.error); return; }
  character = result.data;
  const rows = await supabase.from('character_outfits').select('*').eq('character_id',character.id).order('sort_order');
  if (rows.error) { console.error(rows.error); return; }
  outfits = (rows.data || []).map(item => ({...item,_new:false}));
  outfits.forEach(item => { parseConceal(item); parseDefense(item); });
  render();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
