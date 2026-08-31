import { supabase } from "./supabase-client.js";
import { loadSheetBundle } from "./sheet-load-persistence.js?v=1";
import { buildSkillSavePayloads, buildOutfitSavePayloads } from "./sheet-save-payload.js?v=1";
import { getSheetSaveState, focusSheetSaveButton } from "./sheet-save-state.js?v=2";
import {
  normalizeCharacterSheetUrl,
  buildCharacterSheetReadUrl,
  extractCharacterSheetKey
} from "./character-sheet-url.js?v=2";

const SESSION_KEY = "tnx:character-sheet-comparison:v1";
const DETAIL_LIMIT = 10;
const STYLE_SEPARATOR_MARKER = "[[STYLE_SEPARATOR]]";
const CATEGORY_LABELS = Object.freeze({
  basic: "基本情報",
  personal: "パーソナル／ライフパス",
  styles: "スタイル",
  abilities: "能力値・制御値・CS",
  general: "一般技能",
  social: "社会",
  connection: "コネ",
  styleSkills: "スタイル技能",
  outfits: "アウトフィット"
});
const STYLE_CODE_NAMES = new Map([
  ["0","カブキ"],["1","バサラ"],["2","タタラ"],["3","ミストレス"],["4","カブト"],["5","カリスマ"],["6","マネキン"],["7","カゼ"],["8","フェイト"],["9","クロマク"],["10","エグゼク"],["11","カタナ"],["12","クグツ"],["13","カゲ"],["14","チャクラ"],["15","レッガー"],["16","カブトワリ"],["17","ハイランダー"],["18","マヤカシ"],["19","トーキー"],["20","イヌ"],["21","ニューロ"],
  ["-0","コモン"],["-1","ヒルコ"],["-2","クロガネ"],["-4","イブキ"],["-6","シキガミ"],["-7","アラシ"],["-9","カゲムシャ"],["-12","ミギウデ"],["-17","エトランゼ"],["-18","アヤカシ"],["-21","ウツワ"]
]);

let activeContext = null;

queueMicrotask(init);

function init() {
  installStyles();
  installCompareButton();
  restoreComparison().catch(error => console.error("character sheet comparison restore failed", error));
}

function installCompareButton() {
  const input = document.querySelector("#character-sheet-url");
  if (!input || document.querySelector("#character-sheet-compare")) return;
  const button = document.createElement("button");
  button.id = "character-sheet-compare";
  button.type = "button";
  button.className = "character-sheet-compare-button";
  button.textContent = "倉庫との差分を確認";
  input.insertAdjacentElement("afterend", button);
  button.addEventListener("click", startComparison);
}

async function startComparison() {
  const button = document.querySelector("#character-sheet-compare");
  const rawUrl = document.querySelector("#character-sheet-url")?.value;
  const sourceUrl = normalizeCharacterSheetUrl(rawUrl);
  if (!sourceUrl) {
    alert("キャラクターシート倉庫の保存済みTNXシートURLを入力してください。");
    document.querySelector("#character-sheet-url")?.focus();
    return;
  }
  if (getSheetSaveState() !== "saved") {
    alert("比較前にCAST ARCHIVEの編集内容を保存してください。比較中は保存済み状態を基準にします。");
    focusSheetSaveButton();
    return;
  }

  button.disabled = true;
  showBusy("キャラクターシート倉庫を取得して比較しています…");
  try {
    const externalPayload = await fetchCharacterSheetPayload(sourceUrl);
    const comparedAt = new Date().toISOString();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ phase: "converting", sourceUrl, externalPayload, comparedAt }));
    await applyLegacyPayload(externalPayload);
    const warehouseBundle = captureEditorBundle(sourceUrl);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ phase: "ready", sourceUrl, externalPayload, warehouseBundle, comparedAt }));
    location.reload();
  } catch (error) {
    console.error(error);
    sessionStorage.removeItem(SESSION_KEY);
    hideBusy();
    button.disabled = false;
    alert(`差分比較に失敗しました：${error?.message || error}`);
  }
}

async function restoreComparison() {
  const stored = readSession();
  if (!stored || stored.phase !== "ready") return;
  if (getSheetSaveState() !== "saved") {
    window.setTimeout(restoreComparison, 150);
    return;
  }
  const publicId = new URLSearchParams(location.search).get("id") || "";
  if (!publicId) return clearSession();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return clearSession();

  const archiveBundle = await loadSheetBundle({ publicId, ownerId: user.id });
  const differences = compareBundles(archiveBundle, stored.warehouseBundle);
  activeContext = { ...stored, archiveBundle, differences };
  showComparisonModal(activeContext);
}

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  activeContext = null;
}

async function fetchCharacterSheetPayload(sourceUrl) {
  const primary = buildCharacterSheetReadUrl(sourceUrl);
  const key = extractCharacterSheetKey(sourceUrl);
  if (!primary || !key) throw new Error("キャラクターシート倉庫URLを解析できませんでした。");
  const encoded = encodeURIComponent(key);
  const urls = [
    primary,
    `https://character-sheets.appspot.com/tnx/display.html?ajax=1&key=${encoded}`,
    `https://character-sheets.appspot.com/tnx/display?key=${encoded}&ajax=1`,
    `https://character-sheets.appspot.com/tnx/display.html?key=${encoded}&ajax=1`
  ];
  let lastError = null;
  for (const url of urls) {
    try { return normalizePayload(await jsonpOnce(url)); }
    catch (error) { lastError = error; }
  }
  throw lastError || new Error("キャラクターシート倉庫からデータを取得できませんでした。");
}

function jsonpOnce(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const callback = `__tnxCompare_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    let done = false;
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { delete window[callback]; } catch { window[callback] = undefined; }
      script.remove();
      fn(value);
    };
    const timer = window.setTimeout(() => finish(reject, new Error("キャラクターシート倉庫の応答がタイムアウトしました。")), timeout);
    window[callback] = value => finish(resolve, value);
    script.onerror = () => finish(reject, new Error("キャラクターシート倉庫のデータ取得に失敗しました。"));
    const request = new URL(url);
    request.searchParams.set("callback", callback);
    script.src = request.href;
    document.head.append(script);
  });
}

function parseJsonData(value) {
  if (typeof value !== "string") return value;
  let source = value.trim();
  if (!source) return value;
  if (source.endsWith(";")) source = source.slice(0, -1).trim();
  if (source.startsWith("(") && source.endsWith(")")) source = source.slice(1, -1).trim();
  try { return JSON.parse(source); } catch { return value; }
}

function mergeWrapperMetadata(parsed, wrapper) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return parsed;
  const result = { ...parsed };
  for (const key of ["outline", "name", "nameKana", "player", "display"]) {
    if ((result[key] === undefined || result[key] === null || result[key] === "") && wrapper?.[key] !== undefined) result[key] = wrapper[key];
  }
  return result;
}

function normalizePayload(payload) {
  let data = payload;
  for (let i = 0; i < 6; i += 1) {
    if (typeof data === "string") {
      const parsed = parseJsonData(data);
      if (parsed !== data) { data = parsed; continue; }
      break;
    }
    if (data && typeof data === "object" && typeof data.jsonData === "string" && data.jsonData.trim()) {
      const parsed = parseJsonData(data.jsonData);
      if (parsed !== data.jsonData) { data = mergeWrapperMetadata(parsed, data); continue; }
    }
    if (data && typeof data === "object" && data.data && typeof data.data === "object" && !data.base && !data.skills1 && !data.superhumanskills && !data.weapons) {
      data = mergeWrapperMetadata(data.data, data);
      continue;
    }
    break;
  }
  if (!data || typeof data !== "object") throw new Error("倉庫データをTNXキャラクターとして認識できませんでした。");
  if (!data.outline && data.styles && typeof data.styles === "object" && !Array.isArray(data.styles)) {
    const names = [data.styles.style1, data.styles.style2, data.styles.style3].map(value => STYLE_CODE_NAMES.get(String(value ?? "")) || "");
    if (names.every(Boolean)) data = { ...data, outline: `STYLE:${names.join("=")}` };
  }
  return data;
}

function applyLegacyPayload(payload) {
  return new Promise((resolve, reject) => {
    const dialog = document.querySelector("#legacy-import-dialog");
    const text = document.querySelector("#legacy-import-json");
    const apply = document.querySelector("#legacy-import-apply");
    const message = document.querySelector("#legacy-import-message");
    if (!dialog || !text || !apply || !message) return reject(new Error("既存のデータ取込機能を利用できません。"));

    text.value = JSON.stringify(payload);
    text.dispatchEvent(new Event("input", { bubbles: true }));
    apply.click();
    const started = Date.now();
    let sawBusy = dialog.dataset.importing === "1";
    const tick = () => {
      if (dialog.dataset.importing === "1") sawBusy = true;
      if (sawBusy && dialog.dataset.importing !== "1") {
        if (message.dataset.state === "error" || String(message.textContent || "").includes("エラー")) reject(new Error(message.textContent || "データ取込に失敗しました。"));
        else resolve();
        return;
      }
      if (Date.now() - started > 180000) return reject(new Error("データ変換がタイムアウトしました。"));
      window.setTimeout(tick, 120);
    };
    window.setTimeout(tick, 120);
  });
}

function captureEditorBundle(sourceUrl) {
  return {
    character: captureCharacter(sourceUrl),
    skills: captureSkills(),
    outfits: captureOutfits()
  };
}

function captureCharacter(sourceUrl) {
  const value = selector => document.querySelector(selector)?.value ?? "";
  const number = selector => Number(value(selector) || 0);
  const text = selector => String(document.querySelector(selector)?.textContent || "").trim();
  const character = {
    character_name: value("#character-name").trim(),
    character_kana: value("#character-kana").trim(),
    handle: value("#handle").trim(),
    handle_kana: value("#handle-kana").trim(),
    player_name: value("#player-name").trim(),
    affiliation: value("#affiliation").trim(),
    citizen_rank: value("#citizen-rank").trim(),
    summary: value("#summary"),
    profile: value("#profile"),
    visibility: value("#visibility") === "public" ? "public" : "private",
    experience_points: Number(text("#exp-total") || 0),
    age: value("#age").trim(), gender: value("#gender").trim(), height: value("#height").trim(), weight: value("#weight").trim(),
    eyes: value("#eyes").trim(), hair: value("#hair").trim(), skin: value("#skin").trim(),
    life_path_origin: value("#life-path-origin").trim(), life_path_experience: value("#life-path-experience").trim(), life_path_encounter: value("#life-path-encounter").trim(),
    character_sheet_url: sourceUrl
  };
  for (let index = 1; index <= 3; index += 1) {
    character[`style_${index}`] = value(`#style-${index}`);
    character[`style_${index}_mark`] = value(`#style-${index}-mark`);
    character[`style_${index}_attribute`] = value(`#style-${index}-attribute`);
    character[`divine_${index}`] = text(`#divine-${index}`);
    character[`divine_${index}_yomi`] = text(`#divine-${index}-yomi`);
  }
  for (const key of ["reason", "passion", "life", "mundane"]) {
    const current = number(`#${key}-base`);
    const modifier = number(`#${key}-mod`);
    const controlCurrent = number(`#${key}-control-base`);
    const controlModifier = number(`#${key}-control-mod`);
    character[`${key}_base`] = current;
    character[`${key}_growth`] = 0;
    character[`${key}_gear`] = modifier;
    character[`${key}_manual`] = 0;
    character[`${key}_value`] = current + modifier;
    character[`${key}_control_base`] = controlCurrent;
    character[`${key}_control_growth`] = 0;
    character[`${key}_control_gear`] = controlModifier;
    character[`${key}_control_manual`] = 0;
    character[`${key}_control`] = controlCurrent + controlModifier;
  }
  character.cs_base = number("#cs-base");
  character.cs_gear = number("#cs-mod");
  character.cs_manual = 0;
  character.cs = character.cs_base + character.cs_gear;
  return character;
}

function captureSkills() {
  const rows = [];
  document.querySelectorAll(".skill-group[data-skill-category] tbody tr[data-skill-key]").forEach(row => {
    const category = row.closest(".skill-group")?.dataset.skillCategory || "general";
    if (row.dataset.styleSeparator === "1") {
      rows.push({ category: "style", name: row.querySelector('[data-f="name"]')?.value || "", level: 1, free_level: 0, skill_kind: "none", reason: false, passion: false, life: false, mundane: false, description: STYLE_SEPARATOR_MARKER, _separator: true });
      return;
    }
    const read = field => row.querySelector(`[data-f="${field}"]`);
    rows.push({
      category,
      name: read("name")?.value || "",
      level: Number(read("level")?.value || 0),
      free_level: Number(read("free_level")?.value || 0),
      skill_kind: read("skill_kind")?.value || (category === "general" ? "general" : "proper"),
      reason: Boolean(read("reason")?.checked), passion: Boolean(read("passion")?.checked), life: Boolean(read("life")?.checked), mundane: Boolean(read("mundane")?.checked),
      timing: "", target: "", range: "", difficulty: "", confrontation: "",
      description: read("description")?.value || ""
    });
  });
  return buildSkillSavePayloads(rows, { isStyleSeparator: item => item?._separator === true, styleSeparatorMarker: STYLE_SEPARATOR_MARKER });
}

function captureOutfits() {
  const rows = [];
  document.querySelectorAll(".outfit-card[data-outfit-key]").forEach(card => {
    const item = {};
    card.querySelectorAll("[data-o]").forEach(control => {
      const key = control.dataset.o;
      item[key] = control.type === "number" ? Number(control.value || 0) : control.value;
    });
    try { item._ofc_details = JSON.parse(card.dataset.outfitOfcDetails || "{}"); }
    catch { item._ofc_details = {}; }
    rows.push(item);
  });
  return buildOutfitSavePayloads(rows);
}

function compareBundles(archive, warehouse) {
  const left = comparableBundle(archive);
  const right = comparableBundle(warehouse);
  const differences = [];
  for (const category of Object.keys(CATEGORY_LABELS)) diffObject(left[category] || {}, right[category] || {}, category, [], differences);
  return differences;
}

function comparableBundle(bundle = {}) {
  const c = bundle.character || {};
  const pick = fields => Object.fromEntries(fields.map(field => [field, normalizeScalar(c[field]) ]));
  const skills = Array.isArray(bundle.skills) ? bundle.skills : [];
  return {
    basic: pick(["character_name","character_kana","handle","handle_kana","player_name","affiliation","citizen_rank","summary","profile"]),
    personal: pick(["age","gender","height","weight","eyes","hair","skin","life_path_origin","life_path_experience","life_path_encounter"]),
    styles: pick(["style_1","style_1_mark","style_1_attribute","style_2","style_2_mark","style_2_attribute","style_3","style_3_mark","style_3_attribute"]),
    abilities: pick(["reason_base","reason_gear","reason_control_base","reason_control_gear","passion_base","passion_gear","passion_control_base","passion_control_gear","life_base","life_gear","life_control_base","life_control_gear","mundane_base","mundane_gear","mundane_control_base","mundane_control_gear","cs_base","cs_gear"]),
    general: rowsByIdentity(skills.filter(row => row.category === "general")),
    social: rowsByIdentity(skills.filter(row => row.category === "social")),
    connection: rowsByIdentity(skills.filter(row => row.category === "connection")),
    styleSkills: rowsByIdentity(skills.filter(row => row.category === "style")),
    outfits: rowsByIdentity(Array.isArray(bundle.outfits) ? bundle.outfits : [], row => `${row.category || "other"}:${row.name || "名称なし"}`)
  };
}

function rowsByIdentity(rows, identity = row => row.description === STYLE_SEPARATOR_MARKER ? `区切り:${row.name}` : row.name || "名称なし") {
  const output = {};
  const counts = new Map();
  for (const row of rows) {
    const base = String(identity(row));
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    const key = count === 1 ? base : `${base} #${count}`;
    const cleaned = {};
    for (const [field, value] of Object.entries(row || {})) {
      if (["id","character_id","created_at","updated_at","sort_order","_key"].includes(field)) continue;
      if (field === "ofc_details") continue;
      cleaned[field] = normalizeScalar(value);
    }
    output[key] = cleaned;
  }
  return output;
}

function normalizeScalar(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

function diffObject(left, right, category, path, output) {
  const keys = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);
  for (const key of keys) {
    const a = left?.[key];
    const b = right?.[key];
    const nextPath = [...path, key];
    const objectA = a && typeof a === "object" && !Array.isArray(a);
    const objectB = b && typeof b === "object" && !Array.isArray(b);
    if (objectA || objectB) {
      diffObject(objectA ? a : {}, objectB ? b : {}, category, nextPath, output);
      continue;
    }
    if (String(a ?? "") === String(b ?? "")) continue;
    output.push({ category, path: nextPath.join(" / "), archive: a ?? "", warehouse: b ?? "" });
  }
}

function showComparisonModal(context) {
  document.querySelector("#character-sheet-compare-dialog")?.remove();
  const dialog = document.createElement("dialog");
  dialog.id = "character-sheet-compare-dialog";
  dialog.className = "character-sheet-compare-dialog";
  const differences = context.differences;
  const grouped = groupDifferences(differences);
  const details = differences.length <= DETAIL_LIMIT
    ? `<div class="character-sheet-compare-details">${differences.map(renderDifference).join("") || '<p class="character-sheet-compare-same">差分はありません。CAST ARCHIVEとキャラクターシート倉庫は一致しています。</p>'}</div>`
    : `<div class="character-sheet-compare-summary"><p>差分が多いため詳細表示を省略しています。全内容は「差分をコピー」で確認できます。</p>${Object.entries(grouped).map(([key, count]) => `<span><b>${escapeHtml(CATEGORY_LABELS[key] || key)}</b><strong>${count}件</strong></span>`).join("")}</div>`;

  dialog.innerHTML = `<form method="dialog">
    <header class="character-sheet-compare-header"><div><h2>キャラクターシート倉庫との差分</h2><small>${escapeHtml(formatDate(context.comparedAt))}</small></div><button value="cancel" aria-label="閉じる">×</button></header>
    <section class="character-sheet-compare-meta"><strong>差分 ${differences.length}件</strong><a href="${escapeHtml(context.sourceUrl)}" target="_blank" rel="noopener noreferrer">キャラクターシート倉庫を開く</a></section>
    ${details}
    <section class="character-sheet-compare-choice"><h3>どちらを編集画面に残しますか？</h3>
      <button id="compare-adopt-warehouse" type="button"><strong>CAST ARCHIVEを保存して、倉庫版を採用</strong><small>現在のCAST ARCHIVEをスナップショットに残し、比較した倉庫版を編集画面へ反映します。</small></button>
      <button id="compare-keep-archive" type="button"><strong>倉庫版を保存して、CAST ARCHIVE版を採用</strong><small>比較した倉庫版をスナップショットに残し、現在の編集画面はそのまま維持します。</small></button>
    </section>
    <footer class="character-sheet-compare-actions"><button id="compare-copy" type="button">差分をコピー</button><button value="cancel">閉じる</button></footer>
    <p id="character-sheet-compare-message" aria-live="polite"></p>
  </form>`;
  document.body.append(dialog);
  dialog.querySelector("#compare-copy").addEventListener("click", () => copyDifferences(context));
  dialog.querySelector("#compare-adopt-warehouse").addEventListener("click", () => adoptWarehouse(context, dialog));
  dialog.querySelector("#compare-keep-archive").addEventListener("click", () => keepArchive(context, dialog));
  dialog.addEventListener("close", () => { if (dialog.returnValue === "cancel") clearSession(); });
  dialog.showModal();
}

function groupDifferences(differences) {
  return differences.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + 1; return acc; }, {});
}

function renderDifference(item) {
  return `<article><strong>${escapeHtml(CATEGORY_LABELS[item.category] || item.category)} / ${escapeHtml(item.path)}</strong><div><span><b>CAST ARCHIVE</b>${escapeHtml(displayValue(item.archive))}</span><span><b>倉庫</b>${escapeHtml(displayValue(item.warehouse))}</span></div></article>`;
}

async function copyDifferences(context) {
  const lines = [
    "キャラクターシート倉庫との差分",
    `比較日時: ${formatDate(context.comparedAt)}`,
    `URL: ${context.sourceUrl}`,
    `差分: ${context.differences.length}件`,
    ""
  ];
  if (!context.differences.length) lines.push("差分なし");
  for (const item of context.differences) {
    lines.push(`[${CATEGORY_LABELS[item.category] || item.category}] ${item.path}`);
    lines.push(`CAST ARCHIVE: ${displayValue(item.archive)}`);
    lines.push(`倉庫: ${displayValue(item.warehouse)}`);
    lines.push("");
  }
  const text = lines.join("\n");
  try { await navigator.clipboard.writeText(text); setModalMessage("差分をクリップボードへコピーしました。", "saved"); }
  catch { window.prompt("差分をコピーしてください。", text); }
}

async function adoptWarehouse(context, dialog) {
  if (!confirm("現在のCAST ARCHIVEをスナップショットに保存し、比較したキャラクターシート倉庫版を編集画面へ反映します。続行しますか？")) return;
  setChoiceDisabled(dialog, true);
  setModalMessage("CAST ARCHIVE版をスナップショットへ保存しています…");
  try {
    const snapshots = await waitForSnapshots();
    await snapshots.createCurrent(`比較前 CAST ARCHIVE ${formatDate(context.comparedAt)}`);
    setModalMessage("キャラクターシート倉庫版を編集画面へ反映しています…");
    await applyLegacyPayload(context.externalPayload);
    const target = document.querySelector("#character-sheet-url");
    if (target) {
      target.value = context.sourceUrl;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
    }
    clearSession();
    dialog.close("adopted");
  } catch (error) {
    console.error(error);
    setModalMessage(`処理に失敗しました：${error?.message || error}`, "error");
    setChoiceDisabled(dialog, false);
  }
}

async function keepArchive(context, dialog) {
  if (!confirm("比較したキャラクターシート倉庫版をスナップショットに保存し、現在のCAST ARCHIVE版を編集画面に残します。続行しますか？")) return;
  setChoiceDisabled(dialog, true);
  setModalMessage("キャラクターシート倉庫版をスナップショットへ保存しています…");
  try {
    const snapshots = await waitForSnapshots();
    const snapshotData = {
      character: { ...context.archiveBundle.character, ...context.warehouseBundle.character, character_sheet_url: context.sourceUrl },
      skills: context.warehouseBundle.skills,
      outfits: context.warehouseBundle.outfits
    };
    await snapshots.createBundle(snapshotData, `キャラクターシート倉庫 ${formatDate(context.comparedAt)}`);
    clearSession();
    dialog.close("kept-archive");
  } catch (error) {
    console.error(error);
    setModalMessage(`スナップショット作成に失敗しました：${error?.message || error}`, "error");
    setChoiceDisabled(dialog, false);
  }
}

function waitForSnapshots(timeout = 10000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (window.TNXSheetSnapshots?.createCurrent && window.TNXSheetSnapshots?.createBundle) return resolve(window.TNXSheetSnapshots);
      if (Date.now() - started > timeout) return reject(new Error("既存スナップショット機能を利用できません。"));
      window.setTimeout(tick, 100);
    };
    tick();
  });
}

function setChoiceDisabled(dialog, disabled) {
  dialog.querySelectorAll("#compare-adopt-warehouse,#compare-keep-archive,#compare-copy").forEach(button => { button.disabled = disabled; });
}

function setModalMessage(text, state = "") {
  const node = document.querySelector("#character-sheet-compare-message");
  if (!node) return;
  node.textContent = text;
  node.dataset.state = state;
}

function showBusy(text) {
  hideBusy();
  const overlay = document.createElement("div");
  overlay.id = "character-sheet-compare-busy";
  overlay.className = "character-sheet-compare-busy";
  overlay.innerHTML = `<div><strong>${escapeHtml(text)}</strong><small>比較用に倉庫データを変換しています。画面は自動的に元へ戻ります。</small></div>`;
  document.body.append(overlay);
}
function hideBusy() { document.querySelector("#character-sheet-compare-busy")?.remove(); }

function displayValue(value) {
  if (value === "" || value === null || value === undefined) return "（空欄）";
  if (typeof value === "boolean") return value ? "あり" : "なし";
  return String(value);
}
function formatDate(value) {
  try { return new Intl.DateTimeFormat("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" }).format(new Date(value)); }
  catch { return String(value || ""); }
}
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function installStyles() {
  if (document.querySelector("#character-sheet-compare-style")) return;
  const style = document.createElement("style");
  style.id = "character-sheet-compare-style";
  style.textContent = `
    .character-sheet-url-field{position:relative}.character-sheet-compare-button{margin-top:8px;width:max-content;max-width:100%;padding:8px 12px}
    .character-sheet-compare-dialog{width:min(900px,calc(100vw - 32px));max-height:min(820px,calc(100vh - 32px));padding:0;border:1px solid currentColor;background:var(--panel-bg,#0b1118);color:inherit}
    .character-sheet-compare-dialog::backdrop{background:rgba(0,0,0,.72)}.character-sheet-compare-dialog form{padding:18px;display:grid;gap:14px}
    .character-sheet-compare-header,.character-sheet-compare-meta,.character-sheet-compare-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.character-sheet-compare-header h2{margin:0}.character-sheet-compare-header button{font-size:24px}
    .character-sheet-compare-details{display:grid;gap:8px;max-height:300px;overflow:auto}.character-sheet-compare-details article{border:1px solid rgba(127,127,127,.35);padding:10px}.character-sheet-compare-details article>div{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}.character-sheet-compare-details span{display:grid;gap:3px;overflow-wrap:anywhere}
    .character-sheet-compare-summary{display:grid;gap:8px}.character-sheet-compare-summary span{display:flex;justify-content:space-between;border-bottom:1px solid rgba(127,127,127,.25);padding:5px 0}
    .character-sheet-compare-choice{display:grid;gap:8px;border-top:1px solid rgba(127,127,127,.35);padding-top:12px}.character-sheet-compare-choice h3{margin:0 0 4px}.character-sheet-compare-choice button{display:grid;text-align:left;gap:3px;padding:11px}.character-sheet-compare-choice small{opacity:.8}
    #character-sheet-compare-message[data-state="error"]{color:#ff8f8f}.character-sheet-compare-busy{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(0,0,0,.82)}.character-sheet-compare-busy>div{display:grid;gap:8px;text-align:center;padding:24px;border:1px solid currentColor;background:var(--panel-bg,#0b1118)}
    @media(max-width:700px){.character-sheet-compare-details article>div{grid-template-columns:1fr}.character-sheet-compare-header,.character-sheet-compare-meta,.character-sheet-compare-actions{align-items:flex-start;flex-wrap:wrap}}
  `;
  document.head.append(style);
}
