import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { STYLE_DATA, UTSUWA_ATTRIBUTES } from "./style-data.js";

const params = new URLSearchParams(location.search);
const publicId = params.get("id")?.trim() || "";
const editRequested = params.get("edit") === "1";
const requestedCharacter = params.get("character")?.trim() || "";
const view = document.querySelector("#troop-view");
const editor = document.querySelector("#troop-editor");
const errorBox = document.querySelector("#troop-error");
const status = document.querySelector("#troop-editor-status");
const ABILITIES = ["reason", "passion", "life", "mundane"];
const ABILITY_LABELS = { reason:"理性", passion:"感情", life:"生命", mundane:"外界" };
const SUIT_LABELS = { reason:"♠", passion:"♣", life:"♥", mundane:"♦" };
const STYLE_COST = { none:0, normal:10, secret:20, ultimate:50, direction:2 };
const STYLE_KIND_LABEL = { none:"なし", normal:"通常", secret:"秘技", ultimate:"奥義", direction:"演出" };
const GENERAL_KIND_COST = { general:10, proper:5, social:5, connection:5 };
const GENERAL_KIND_LABEL = { general:"一般", proper:"固有名詞", social:"社会", connection:"コネ" };
let user = null;
let troop = null;
let ownedCharacters = [];

initialize();

async function initialize() {
  const auth = await supabase.auth.getUser();
  user = auth.data?.user ?? null;
  if (editRequested && !user) { user = await requireAuth(); if (!user) return; }
  if (publicId) {
    const result = await supabase.from("troops").select("*").eq("public_id", publicId).maybeSingle();
    if (result.error || !result.data) return showError("トループデータが見つからないか、閲覧権限がありません。");
    troop = result.data;
  }
  if (editRequested) {
    if (troop && troop.owner_id !== user.id) return showError("このトループを編集する権限がありません。");
    await loadOwnedCharacters(); renderEditor();
  } else if (troop) await renderView();
  else showError("トループIDが指定されていません。");
}

async function loadOwnedCharacters() {
  const result = await supabase.from("characters").select("id, public_id, character_name, handle").eq("owner_id", user.id).order("character_name");
  if (result.error) throw result.error;
  ownedCharacters = result.data ?? [];
}

function renderEditor() {
  editor.hidden = false; view.hidden = true;
  const characterSelect = document.querySelector("#troop-character");
  characterSelect.innerHTML = `<option value="">未設定</option>${ownedCharacters.map(c => `<option value="${c.id}">${escapeHtml(c.character_name)}</option>`).join("")}`;
  characterSelect.value = troop?.character_id || ownedCharacters.find(c => c.public_id === requestedCharacter)?.id || "";
  setValue("#troop-name", troop?.name || ""); setValue("#troop-visibility", troop?.visibility || "private");
  setValue("#troop-level", troop?.level ?? 0); setValue("#troop-member-max", troop?.member_max ?? 1); setValue("#troop-notes", troop?.notes || "");
  setupStyleSelect();
  setValue("#troop-style", troop?.style_1 || ""); setValue("#troop-utsuwa-attribute", troop?.utsuwa_attribute || ""); updateStyleUI();
  const legacySkills = Array.isArray(troop?.skills) ? troop.skills : [];
  const generalSkills = legacySkills.filter(s => s.category === "general" || ["general","proper","social","connection"].includes(s.kind));
  const styleSkills = legacySkills.filter(s => s.category === "style" || (!s.category && ["normal","secret","ultimate","direction","none"].includes(s.type)));
  generalSkills.forEach(addGeneralSkillRow); styleSkills.forEach(addStyleSkillRow);
  (troop?.combos ?? []).forEach(addComboRow); (troop?.outfits ?? []).forEach(addOutfitRow);
  bindEditorEvents(); recalculateEditor();
  const deleteButton = document.querySelector("#troop-delete"); deleteButton.hidden = !troop; deleteButton.addEventListener("click", deleteTroop);
  if (troop) document.querySelector("#troop-cancel").href = `./troop.html?id=${encodeURIComponent(troop.public_id)}`;
}

function setupStyleSelect() {
  const style = document.querySelector("#troop-style");
  style.innerHTML = `<option value="">選択してください</option>${STYLE_DATA.map(item => `<option value="${escapeAttr(item.name)}">${escapeHtml(item.name)}</option>`).join("")}`;
  const attr = document.querySelector("#troop-utsuwa-attribute");
  attr.innerHTML = `<option value="">選択してください</option>${UTSUWA_ATTRIBUTES.map(item => `<option value="${escapeAttr(item.name)}">${escapeHtml(item.name)}</option>`).join("")}`;
}

function bindEditorEvents() {
  document.querySelector("#troop-style").addEventListener("change", () => { updateStyleUI(); recalculateEditor(); });
  document.querySelector("#troop-utsuwa-attribute").addEventListener("change", recalculateEditor);
  document.querySelector("#troop-level").addEventListener("input", recalculateEditor);
  document.querySelector("#troop-general-skill-add").addEventListener("click", () => { addGeneralSkillRow(); recalculateEditor(); });
  document.querySelector("#troop-style-skill-add").addEventListener("click", () => { addStyleSkillRow(); recalculateEditor(); });
  document.querySelector("#troop-combo-add").addEventListener("click", () => addComboRow());
  document.querySelector("#troop-outfit-add").addEventListener("click", () => addOutfitRow());
  editor.addEventListener("input", event => { if (event.target.closest(".troop-skill-row")) syncSkillRow(event.target); recalculateEditor(); });
  editor.addEventListener("change", event => { if (event.target.closest(".troop-skill-row")) syncSkillRow(event.target); recalculateEditor(); });
  editor.addEventListener("submit", saveTroop);
}

function updateStyleUI() {
  const isUtsuwa = value("#troop-style") === "ウツワ";
  document.querySelector("#troop-utsuwa-wrap").hidden = !isUtsuwa;
  if (!isUtsuwa) setValue("#troop-utsuwa-attribute", "");
}

function styleRecord() {
  const name = value("#troop-style");
  if (name === "ウツワ") return UTSUWA_ATTRIBUTES.find(item => item.name === value("#troop-utsuwa-attribute")) || null;
  return STYLE_DATA.find(item => item.name === name) || null;
}

function calculateAbilities(styleName = value("#troop-style"), utsuwaAttribute = value("#troop-utsuwa-attribute"), level = intValue("#troop-level")) {
  const record = styleName === "ウツワ" ? UTSUWA_ATTRIBUTES.find(item => item.name === utsuwaAttribute) : STYLE_DATA.find(item => item.name === styleName);
  return Object.fromEntries(ABILITIES.map(key => [key, { value:(Number(record?.[key]?.[0]) || 0) + level, control:(Number(record?.[key]?.[1]) || 0) + level }]));
}

function recalculateEditor() {
  const abilities = calculateAbilities();
  document.querySelector("#troop-ability-preview").innerHTML = abilityMarkup(abilities);
  const exp = calculateExperience();
  setValue("#troop-exp", exp);
}

function calculateExperience() {
  let total = 0;
  document.querySelectorAll("#troop-general-skills-editor .troop-skill-row").forEach(row => {
    const level = rowInt(row, "level"); const kind = rowValue(row, "kind") || "general";
    total += level * (GENERAL_KIND_COST[kind] ?? 10);
    const exp = row.querySelector('[data-field="exp"]'); if (exp) exp.value = level * (GENERAL_KIND_COST[kind] ?? 10);
  });
  document.querySelectorAll("#troop-style-skills-editor .troop-skill-row").forEach(row => {
    const level = rowInt(row, "level"); const kind = rowValue(row, "kind") || "normal";
    total += level * (STYLE_COST[kind] ?? 10);
    const exp = row.querySelector('[data-field="exp"]'); if (exp) exp.value = level * (STYLE_COST[kind] ?? 10);
  });
  return total;
}

function syncSkillRow(control) {
  const row = control.closest(".troop-skill-row"); if (!row) return;
  const levelInput = row.querySelector('[data-field="level"]'); const boxes = [...row.querySelectorAll('[data-suit]')];
  if (control.matches('[data-field="level"]')) {
    let level = Math.max(0, Number.parseInt(levelInput.value || "0", 10) || 0); levelInput.value = level;
    if (level >= 4) boxes.forEach(box => box.checked = true);
  } else if (control.matches("[data-suit]")) {
    const count = boxes.filter(box => box.checked).length; const current = Math.max(0, Number.parseInt(levelInput.value || "0", 10) || 0);
    if (control.checked && count > current) levelInput.value = count;
    if (!control.checked && count < current && current <= 4) levelInput.value = count;
    if (Number(levelInput.value) >= 4) boxes.forEach(box => box.checked = true);
  }
}

function addGeneralSkillRow(data={}) { addSkillRow("#troop-general-skills-editor", data, "general"); }
function addStyleSkillRow(data={}) { addSkillRow("#troop-style-skills-editor", data, "style"); }
function addSkillRow(selector, data={}, category) {
  const row = document.createElement("div"); row.className = "troop-editor-row troop-skill-row"; row.dataset.category = category;
  const kindOptions = category === "style"
    ? Object.entries(STYLE_KIND_LABEL).map(([v,l]) => `<option value="${v}">${l}</option>`).join("")
    : Object.entries(GENERAL_KIND_LABEL).map(([v,l]) => `<option value="${v}">${l}</option>`).join("");
  row.innerHTML = `<input data-field="name" placeholder="技能名" value="${escapeAttr(data.name || "")}"><select data-field="kind">${kindOptions}</select><input data-field="level" type="number" min="0" value="${Number(data.level ?? 1)}" aria-label="技能レベル"><div class="troop-suits">${ABILITIES.map(key => `<label><input type="checkbox" data-suit="${key}" ${data[key] ? "checked" : ""}><span>${SUIT_LABELS[key]}</span></label>`).join("")}</div><input data-field="exp" type="number" readonly aria-label="消費経験点"><input data-field="notes" placeholder="解説／メモ" value="${escapeAttr(data.notes || "")}"><button type="button" data-remove>×</button>`;
  row.querySelector('[data-field="kind"]').value = data.kind || data.type || (category === "style" ? "normal" : "general");
  if (Number(data.level) >= 4) row.querySelectorAll("[data-suit]").forEach(box => box.checked = true);
  row.querySelector("[data-remove]").addEventListener("click", () => { row.remove(); recalculateEditor(); });
  document.querySelector(selector).append(row);
}

function addComboRow(data={}) {
  const row = document.createElement("div"); row.className = "troop-editor-row troop-editor-row--combo";
  row.innerHTML = `<input data-field="name" placeholder="コンボ名" value="${escapeAttr(data.name || "")}"><input data-field="skills" placeholder="組み合わせ技能" value="${escapeAttr(data.skills || "")}"><select data-field="ability"><option value="">能力</option>${ABILITIES.map(k=>`<option value="${k}">${SUIT_LABELS[k]} ${ABILITY_LABELS[k]}</option>`).join("")}</select><input data-field="modifier" placeholder="判定修正" value="${escapeAttr(data.modifier || "")}"><input data-field="target_value" placeholder="達成値目安" value="${escapeAttr(data.target_value || "")}"><input data-field="timing" placeholder="タイミング" value="${escapeAttr(data.timing || "")}"><input data-field="target" placeholder="対象" value="${escapeAttr(data.target || "")}"><input data-field="range" placeholder="射程" value="${escapeAttr(data.range || "")}"><input data-field="act_use_limit" type="number" min="1" placeholder="1アクト回数" value="${escapeAttr(data.act_use_limit || "")}"><input data-field="description" placeholder="解説" value="${escapeAttr(data.description || "")}"><button type="button" data-remove>×</button>`;
  row.querySelector('[data-field="ability"]').value = data.ability || "";
  row.querySelector("[data-remove]").addEventListener("click", () => row.remove()); document.querySelector("#troop-combos-editor").append(row);
}
function addOutfitRow(data={}) {
  const row = document.createElement("div"); row.className = "troop-editor-row troop-editor-row--outfit";
  row.innerHTML = `<input data-field="name" placeholder="アウトフィット名" value="${escapeAttr(data.name || "")}"><input data-field="notes" placeholder="性能／メモ" value="${escapeAttr(data.notes || "")}"><button type="button" data-remove>×</button>`;
  row.querySelector("[data-remove]").addEventListener("click", () => row.remove()); document.querySelector("#troop-outfits-editor").append(row);
}

async function renderView() {
  view.hidden = false; editor.hidden = true;
  document.querySelector("#troop-public-id").textContent = `${troop.public_id} / ${troop.visibility === "public" ? "PUBLIC" : "PRIVATE"}`;
  document.querySelector("#troop-name-view").textContent = troop.name || "名称未設定"; document.querySelector("#troop-level-view").textContent = troop.level;
  document.querySelector("#troop-member-max-view").textContent = troop.member_max; document.querySelector("#troop-exp-view").textContent = troop.experience_spent ?? calculateStoredExperience(troop.skills);
  const styleText = troop.style_1 === "ウツワ" && troop.utsuwa_attribute ? `ウツワ（${troop.utsuwa_attribute}）` : (troop.style_1 || "未設定");
  document.querySelector("#troop-style-view").innerHTML = `<span>${escapeHtml(styleText)}</span>`;
  const abilities = calculateAbilities(troop.style_1, troop.utsuwa_attribute, Number(troop.level || 0));
  document.querySelector("#troop-abilities-view").innerHTML = abilityMarkup(abilities);
  const skills = Array.isArray(troop.skills) ? troop.skills : [];
  renderSkillList("#troop-general-skills-view", skills.filter(s => s.category === "general" || ["general","proper","social","connection"].includes(s.kind)));
  renderSkillList("#troop-style-skills-view", skills.filter(s => s.category === "style" || (!s.category && ["normal","secret","ultimate","direction","none"].includes(s.type))));
  renderDataList("#troop-combos-view", troop.combos, comboMarkup);
  renderDataList("#troop-outfits-view", troop.outfits, item => `<strong>${escapeHtml(item.name || "名称未設定")}</strong><p>${escapeHtml(item.notes || "")}</p>`);
  document.querySelector("#troop-notes-view").textContent = troop.notes || "—";
  const owner = user && troop.owner_id === user.id; const editLink = document.querySelector("#troop-edit-link"); editLink.hidden = !owner;
  if (owner) editLink.href = `./troop.html?id=${encodeURIComponent(troop.public_id)}&edit=1`;
  document.querySelector("#troop-share-button").addEventListener("click", shareTroop); if (troop.character_id) await renderLinkedCharacter();
}

function abilityMarkup(abilities) { return ABILITIES.map(key => `<article><span>${ABILITY_LABELS[key]}</span><strong>${abilities[key].value}</strong><small>制御 ${abilities[key].control}</small></article>`).join(""); }
function renderSkillList(selector, items) {
  renderDataList(selector, items, item => { const suits = ABILITIES.filter(k => item[k]).map(k => SUIT_LABELS[k]).join("") || "—"; const category = item.category === "style" || ["normal","secret","ultimate","direction","none"].includes(item.kind || item.type) ? "style" : "general"; const kind = item.kind || item.type || (category === "style" ? "normal" : "general"); const cost = Number(item.exp_cost ?? (Number(item.level||0) * (category === "style" ? (STYLE_COST[kind]??10) : (GENERAL_KIND_COST[kind]??10)))); return `<strong>${escapeHtml(item.name || "名称未設定")}</strong><span>${escapeHtml(category === "style" ? (STYLE_KIND_LABEL[kind]||kind) : (GENERAL_KIND_LABEL[kind]||kind))} / Lv.${Number(item.level||0)} / ${suits} / EXP ${cost}</span><p>${escapeHtml(item.notes || "")}</p>`; });
}
function comboMarkup(item) { const ability = item.ability ? `${SUIT_LABELS[item.ability]||""} ${ABILITY_LABELS[item.ability]||item.ability}` : "能力未指定"; const detail = [item.timing&&`タイミング：${item.timing}`,item.target&&`対象：${item.target}`,item.range&&`射程：${item.range}`,item.act_use_limit&&`1アクト：${item.act_use_limit}回`].filter(Boolean).join(" / "); return `<strong>${escapeHtml(item.name || "名称未設定")}</strong><span>${escapeHtml(ability)} / 修正 ${escapeHtml(item.modifier || "—")} / 達成値 ${escapeHtml(item.target_value || "—")}</span><p>${escapeHtml(item.skills || "")}${detail ? `<br>${escapeHtml(detail)}` : ""}${item.description ? `<br>${escapeHtml(item.description)}` : ""}</p>`; }
function calculateStoredExperience(skills=[]) { return (skills||[]).reduce((sum,item)=>sum+Number(item.exp_cost||0),0); }

async function renderLinkedCharacter() {
  const result = await supabase.from("characters").select("public_id, character_name").eq("id", troop.character_id).maybeSingle(); const node = document.querySelector("#troop-linked-character-view");
  if (result.data) node.innerHTML = `所属キャスト：<a href="./cast.html?id=${encodeURIComponent(result.data.public_id)}">${escapeHtml(result.data.character_name)}</a>`; else node.textContent = "所属キャスト：非公開キャスト";
}

async function saveTroop(event) {
  event.preventDefault();
  const styleName = value("#troop-style"); if (!styleName) return setStatus("スタイルを選択してください。", true);
  if (styleName === "ウツワ" && !value("#troop-utsuwa-attribute")) return setStatus("ウツワの属性を選択してください。", true);
  const general = collectSkills("#troop-general-skills-editor", "general"); const style = collectSkills("#troop-style-skills-editor", "style");
  if (style.filter(i => i.kind === "secret").length > 2) return setStatus("秘技は2つまでです。", true);
  if (style.filter(i => i.kind === "ultimate").length > 1) return setStatus("奥義は1つまでです。", true);
  const level = intValue("#troop-level"); const abilities = calculateAbilities(styleName, value("#troop-utsuwa-attribute"), level); const exp = calculateExperience();
  const payload = { owner_id:user.id, character_id:value("#troop-character")||null, name:value("#troop-name"), visibility:value("#troop-visibility"), level, member_max:Math.max(1,intValue("#troop-member-max")), member_current:Math.max(1,intValue("#troop-member-max")), style_1:styleName, style_2:"", style_3:"", utsuwa_attribute:value("#troop-utsuwa-attribute"), reason_value:abilities.reason.value, reason_control:abilities.reason.control, passion_value:abilities.passion.value, passion_control:abilities.passion.control, life_value:abilities.life.value, life_control:abilities.life.control, mundane_value:abilities.mundane.value, mundane_control:abilities.mundane.control, skills:[...general,...style], combos:collectRows("#troop-combos-editor",["name","skills","ability","modifier","target_value","timing","target","range","act_use_limit","description"]).filter(i=>i.name), outfits:collectRows("#troop-outfits-editor",["name","notes"]).filter(i=>i.name), experience_spent:exp, notes:value("#troop-notes") };
  setStatus("保存中…");
  const result = troop ? await supabase.from("troops").update(payload).eq("id",troop.id).eq("owner_id",user.id).select("public_id").single() : await supabase.from("troops").insert(payload).select("public_id").single();
  if (result.error) return setStatus(result.error.message,true); location.href=`./troop.html?id=${encodeURIComponent(result.data.public_id)}`;
}

function collectSkills(selector, category) {
  return [...document.querySelector(selector).children].map(row => { const level=rowInt(row,"level"); const kind=rowValue(row,"kind")||(category==="style"?"normal":"general"); const cost=level*(category==="style"?(STYLE_COST[kind]??10):(GENERAL_KIND_COST[kind]??10)); return { category, name:rowValue(row,"name"), kind, type:kind, level, reason:row.querySelector('[data-suit="reason"]')?.checked||false, passion:row.querySelector('[data-suit="passion"]')?.checked||false, life:row.querySelector('[data-suit="life"]')?.checked||false, mundane:row.querySelector('[data-suit="mundane"]')?.checked||false, exp_cost:cost, notes:rowValue(row,"notes") }; }).filter(i=>i.name);
}
async function deleteTroop(){if(!troop||!confirm(`「${troop.name}」を削除します。`))return;const result=await supabase.from("troops").delete().eq("id",troop.id).eq("owner_id",user.id);if(result.error)return setStatus(result.error.message,true);location.href="./troops.html";}
async function shareTroop(){if(troop.visibility!=="public")return alert("共有URLでRLに確認してもらうには、公開状態を「公開」にしてください。");const url=new URL("./troop.html",location.href);url.searchParams.set("id",troop.public_id);try{await navigator.clipboard.writeText(url.href);alert("共有URLをコピーしました。");}catch{prompt("共有URL",url.href);}}
function collectRows(selector,fields){return [...document.querySelector(selector).children].map(row=>Object.fromEntries(fields.map(f=>[f,f==="act_use_limit"?(Number.parseInt(row.querySelector(`[data-field="${f}"]`)?.value||"0",10)||null):String(row.querySelector(`[data-field="${f}"]`)?.value||"").trim()])));}
function renderDataList(selector,items,renderer){const root=document.querySelector(selector);root.innerHTML=(items??[]).length?(items??[]).map(i=>`<article>${renderer(i)}</article>`).join(""):`<p class="empty-data">登録なし</p>`;}
function rowValue(row,f){return String(row.querySelector(`[data-field="${f}"]`)?.value||"").trim();} function rowInt(row,f){return Math.max(0,Number.parseInt(rowValue(row,f)||"0",10)||0);} function value(selector){return String(document.querySelector(selector)?.value??"").trim();} function intValue(selector){return Math.max(0,Number.parseInt(value(selector)||"0",10)||0);} function setValue(selector,v){const n=document.querySelector(selector);if(n)n.value=v??"";}
function setStatus(message,error=false){status.textContent=message;status.dataset.state=error?"error":"working";} function showError(message){errorBox.hidden=false;errorBox.textContent=message;view.hidden=true;editor.hidden=true;}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));} function escapeAttr(v){return escapeHtml(v);}
