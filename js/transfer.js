import { fetchTransferBundle, resolvePublicId, buildCharacterSheetsPayload } from "./tnx-direct-transfer-data.js?v=2";

const REGISTER_URL = "https://character-sheets.appspot.com/tnx/register";
const TARGET_EDIT_URL = "https://character-sheets.appspot.com/tnx/edit.html";
const form = document.querySelector("#transfer-form");
const sourceInput = document.querySelector("#source-cast");
const loadButton = document.querySelector("#load-cast");
const loadStatus = document.querySelector("#load-status");
const modeInputs = [...document.querySelectorAll('input[name="transfer-mode"]')];
const updateOnly = [...document.querySelectorAll(".update-only")];
const updateUrlInput = document.querySelector("#update-url");
const passwordInput = document.querySelector("#transfer-password");
const hideInput = document.querySelector("#hide-from-list");
const confirmInput = document.querySelector("#confirm-register");
const confirmText = document.querySelector("#confirm-text");
const submitButton = document.querySelector("#submit-register");
const status = document.querySelector("#status");
const previewCast = document.querySelector("#preview-cast");
const previewStyles = document.querySelector("#preview-styles");
const previewSkills = document.querySelector("#preview-skills");
const previewOutfits = document.querySelector("#preview-outfits");
const previewMode = document.querySelector("#preview-mode");
const previewKey = document.querySelector("#preview-key");
const previewDisplay = document.querySelector("#preview-display");
const returnLink = document.querySelector("#return-to-cast");
const resultPanel = document.querySelector("#transfer-result");
const resultMessage = document.querySelector("#transfer-result-message");
const newKeyRow = document.querySelector("#new-key-row");
const resultKeyInput = document.querySelector("#result-key");
const buildResultLinkButton = document.querySelector("#build-result-link");
const resultLink = document.querySelector("#transfer-result-link");

let loadedBundle = null;
let loadedPayload = null;
let loading = false;

if (!form || !sourceInput || !loadButton || !loadStatus || !modeInputs.length || !updateUrlInput || !passwordInput || !hideInput || !confirmInput || !confirmText || !submitButton || !status) {
  throw new Error("データ転記UIを初期化できませんでした。");
}

function currentMode() {
  return modeInputs.find(input => input.checked)?.value === "update" ? "update" : "new";
}

function validKey(value) {
  const key = String(value || "").trim();
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : "";
}

function createTargetEditUrl(key) {
  const safeKey = validKey(key);
  if (!safeKey) throw new Error("有効なkeyを確認できませんでした。");
  const url = new URL(TARGET_EDIT_URL);
  url.searchParams.set("key", safeKey);
  return url.href;
}

function resolveUpdateKey(raw) {
  const value = String(raw || "").trim();
  if (!value) throw new Error("更新先URLを入力してください。");
  let url;
  try { url = new URL(value); } catch { throw new Error("更新先URLの形式が正しくありません。"); }
  if (url.protocol !== "https:" || url.hostname !== "character-sheets.appspot.com") throw new Error("character-sheets.appspot.com のHTTPS URLを指定してください。");
  if (url.pathname.replace(/\/+$/, "") !== "/tnx/edit.html") throw new Error("TNXの edit.html URLを指定してください。");
  const key = validKey(url.searchParams.get("key"));
  if (!key) throw new Error("更新先URLに有効な key がありません。");
  return key;
}

function extractResultKey(raw) {
  const value = String(raw || "").trim();
  if (!value) throw new Error("登録結果JSONまたはkeyを入力してください。");
  const direct = validKey(value);
  if (direct) return direct;
  try {
    const parsed = JSON.parse(value);
    const key = validKey(parsed?.key);
    if (key) return key;
  } catch {}
  try {
    const url = new URL(value);
    const key = validKey(url.searchParams.get("key"));
    if (key) return key;
  } catch {}
  throw new Error("登録結果からkeyを確認できませんでした。");
}

function showResultLink(key, message) {
  if (!resultPanel || !resultLink) return;
  const href = createTargetEditUrl(key);
  resultPanel.hidden = false;
  resultLink.href = href;
  resultLink.hidden = false;
  if (resultMessage) resultMessage.textContent = message;
}

function prepareNewResult() {
  if (!resultPanel) return;
  resultPanel.hidden = false;
  if (newKeyRow) newKeyRow.hidden = false;
  if (resultLink) resultLink.hidden = true;
  if (resultMessage) resultMessage.textContent = "別タブに表示された登録結果JSONを下へ貼り付けると、登録されたキャラシ倉庫URLを生成します。";
  resultKeyInput?.focus();
}

function styleMarkCode(mark) {
  const value = String(mark || "");
  const persona = value.includes("◎");
  const key = value.includes("●");
  if (persona && key) return "3";
  if (persona) return "2";
  if (key) return "1";
  return null;
}

function applyStyleMarks(payload, bundle) {
  if (!payload?.jsonData || !bundle?.character) return payload;
  const raw = String(payload.jsonData);
  if (!raw.startsWith("(") || !raw.endsWith(")")) throw new Error("スタイル指定を追加できないjsonData形式です。");
  const json = JSON.parse(raw.slice(1, -1));
  json.styles ||= {};
  json.styles.pk1 = styleMarkCode(bundle.character.style_1_mark);
  json.styles.pk2 = styleMarkCode(bundle.character.style_2_mark);
  json.styles.pk3 = styleMarkCode(bundle.character.style_3_mark);
  return { ...payload, jsonData: `(${JSON.stringify(json)})` };
}

function buildPayload(bundle) {
  return applyStyleMarks(
    buildCharacterSheetsPayload(bundle, { hideFromList: hideInput.checked }),
    bundle
  );
}

function invalidateLoadedData(message = "CASTデータが変更されました。再読込してください。") {
  loadedBundle = null;
  loadedPayload = null;
  loadStatus.dataset.state = "";
  loadStatus.textContent = message;
  previewCast.textContent = "未読込";
  previewStyles.textContent = "—";
  previewSkills.textContent = "—";
  previewOutfits.textContent = "—";
  confirmInput.checked = false;
  updateReadyState();
}

async function loadCast() {
  if (loading) return;
  const publicId = resolvePublicId(sourceInput.value);
  if (!publicId) {
    invalidateLoadedData("CAST ARCHIVEのキャストIDまたはURLを入力してください。");
    loadStatus.dataset.state = "error";
    return;
  }

  loading = true;
  loadButton.disabled = true;
  loadStatus.dataset.state = "";
  loadStatus.textContent = `${publicId} を読み込んでいます…`;
  status.textContent = "未送信です。";
  confirmInput.checked = false;

  try {
    const bundle = await fetchTransferBundle(publicId);
    const payload = buildPayload(bundle);
    loadedBundle = bundle;
    loadedPayload = payload;
    sourceInput.value = payload.summary.publicId || publicId;
    if (returnLink) returnLink.href = `./cast.html?id=${encodeURIComponent(payload.summary.publicId || publicId)}`;
    loadStatus.dataset.state = "ok";
    loadStatus.textContent = `読込・変換確認済み：${payload.name}（${payload.summary.publicId}）。このデータだけが送信対象です。`;
    renderPayloadPreview(payload);
  } catch (error) {
    console.error("direct transfer cast load failed", error);
    loadedBundle = null;
    loadedPayload = null;
    loadStatus.dataset.state = "error";
    loadStatus.textContent = error instanceof Error ? error.message : "CASTデータの読込・変換に失敗しました。";
    previewCast.textContent = "読込失敗";
    previewStyles.textContent = "—";
    previewSkills.textContent = "—";
    previewOutfits.textContent = "—";
  } finally {
    loading = false;
    loadButton.disabled = false;
    updateReadyState();
  }
}

function rebuildLoadedPayload() {
  if (!loadedBundle) return;
  try {
    loadedPayload = buildPayload(loadedBundle);
    renderPayloadPreview(loadedPayload);
    loadStatus.dataset.state = "ok";
  } catch (error) {
    loadedPayload = null;
    loadStatus.dataset.state = "error";
    loadStatus.textContent = error instanceof Error ? error.message : "送信データの再構築に失敗しました。";
  }
}

function renderPayloadPreview(payload) {
  const summary = payload.summary;
  previewCast.textContent = `${payload.name}${payload.nameKana ? `（${payload.nameKana}）` : ""} / ${summary.publicId}`;
  previewStyles.textContent = summary.styles || "—";
  previewSkills.textContent = `一般 ${summary.generalSkills} / 社会 ${summary.socialSkills} / コネ ${summary.connectionSkills} / スタイル ${summary.styleSkills}`;
  previewOutfits.textContent = `${summary.outfits} 件`;
  previewDisplay.textContent = hideInput.checked ? "リストに載せない" : "表示する";
}

function refreshModeUi() {
  const isUpdate = currentMode() === "update";
  updateOnly.forEach(node => { node.hidden = !isUpdate; });
  updateUrlInput.required = isUpdate;
  previewMode.textContent = isUpdate ? "既存キャストを更新" : "新規登録";
  confirmText.textContent = isUpdate
    ? "指定した既存キャストを、読み込んだCAST ARCHIVEデータで上書き更新することを確認しました。"
    : "読み込んだCAST ARCHIVEキャストを新規登録することを確認しました。";
  submitButton.innerHTML = isUpdate
    ? 'キャラシ倉庫を更新 <small>POST UPDATE TO CHARACTER SHEETS</small>'
    : 'キャラシ倉庫へ新規登録 <small>POST TO CHARACTER SHEETS</small>';
  confirmInput.checked = false;
  if (resultPanel) resultPanel.hidden = true;
  if (newKeyRow) newKeyRow.hidden = true;
  updateReadyState();
}

function updateReadyState() {
  const isUpdate = currentMode() === "update";
  let targetReady = true;
  if (isUpdate) {
    try {
      previewKey.textContent = resolveUpdateKey(updateUrlInput.value);
    } catch {
      targetReady = false;
      previewKey.textContent = "未確定（有効な更新先URLが必要）";
    }
  } else {
    previewKey.textContent = "空欄（新規登録）";
  }
  previewDisplay.textContent = hideInput.checked ? "リストに載せない" : "表示する";
  submitButton.disabled = !(loadedPayload && passwordInput.value && confirmInput.checked && targetReady && !loading);
}

function validatePayload(payload) {
  if (!payload || !payload.jsonData) throw new Error("送信データが未生成です。");
  if (!payload.name || !payload.outline) throw new Error("キャスト名またはスタイル情報がありません。");
  if (!payload.jsonData.includes(`\"name\":${JSON.stringify(payload.name)}`)) throw new Error("jsonData内のキャスト名を確認できません。");
  if (!payload.jsonData.includes(`\"outline\":${JSON.stringify(payload.outline)}`)) throw new Error("jsonData内のスタイル情報を確認できません。");
  const expectedDisplay = hideInput.checked ? '\"display\":\"0\"' : '\"display\":null';
  if (!payload.jsonData.includes(expectedDisplay)) throw new Error("jsonData内のリスト表示設定が一致しません。");
}

function submitOutbound(event) {
  event.preventDefault();
  if (submitButton.disabled) return;

  const isUpdate = currentMode() === "update";
  let key = "";
  try {
    if (!loadedPayload) throw new Error("CASTデータを読み込んでください。");
    if (!passwordInput.value) throw new Error("編集パスワードを入力してください。");
    if (!confirmInput.checked) throw new Error("最終確認が未チェックです。");
    if (isUpdate) key = resolveUpdateKey(updateUrlInput.value);
    validatePayload(loadedPayload);
  } catch (error) {
    status.textContent = `安全停止：${error instanceof Error ? error.message : error} 送信していません。`;
    updateReadyState();
    return;
  }

  submitButton.disabled = true;
  loadButton.disabled = true;
  modeInputs.forEach(control => { control.disabled = true; });
  sourceInput.readOnly = true;
  updateUrlInput.readOnly = true;
  passwordInput.readOnly = true;
  hideInput.disabled = true;
  confirmInput.disabled = true;
  status.textContent = isUpdate
    ? `「${loadedPayload.name}」の更新結果を別タブで開きます。`
    : `「${loadedPayload.name}」の新規登録結果を別タブで開きます。`;

  if (isUpdate) {
    if (newKeyRow) newKeyRow.hidden = true;
    showResultLink(key, "更新先のキャラシ倉庫を開けます。別タブの登録結果も確認してください。");
  } else {
    prepareNewResult();
  }

  const outbound = document.createElement("form");
  outbound.method = "POST";
  outbound.action = REGISTER_URL;
  outbound.target = "_blank";
  outbound.acceptCharset = "UTF-8";
  outbound.style.display = "none";

  const fields = {
    key,
    player: loadedPayload.player,
    name: loadedPayload.name,
    nameKana: loadedPayload.nameKana,
    display: hideInput.checked ? "0" : "null",
    jsonData: loadedPayload.jsonData,
    outline: loadedPayload.outline,
    password: passwordInput.value,
    ajax: "1"
  };

  for (const [field, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = field;
    input.value = String(value ?? "");
    outbound.append(input);
  }
  document.body.append(outbound);
  outbound.submit();
  outbound.remove();
}

function buildResultLink() {
  try {
    const key = extractResultKey(resultKeyInput?.value);
    showResultLink(key, "登録されたキャラシ倉庫URLを生成しました。");
  } catch (error) {
    if (resultMessage) resultMessage.textContent = error instanceof Error ? error.message : String(error);
    if (resultLink) resultLink.hidden = true;
  }
}

loadButton.addEventListener("click", loadCast);
sourceInput.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  loadCast();
});
sourceInput.addEventListener("input", () => {
  if (!loadedPayload) return;
  const entered = resolvePublicId(sourceInput.value);
  if (entered && entered !== loadedPayload.summary.publicId) invalidateLoadedData();
});
modeInputs.forEach(control => control.addEventListener("change", refreshModeUi));
updateUrlInput.addEventListener("input", () => { confirmInput.checked = false; updateReadyState(); });
passwordInput.addEventListener("input", updateReadyState);
hideInput.addEventListener("change", () => {
  confirmInput.checked = false;
  rebuildLoadedPayload();
  updateReadyState();
});
confirmInput.addEventListener("change", updateReadyState);
form.addEventListener("submit", submitOutbound);
buildResultLinkButton?.addEventListener("click", buildResultLink);
resultKeyInput?.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  buildResultLink();
});

refreshModeUi();

const initialId = new URLSearchParams(location.search).get("id")?.trim() || "";
if (initialId) {
  sourceInput.value = initialId;
  if (returnLink) returnLink.href = `./cast.html?id=${encodeURIComponent(initialId)}`;
  loadCast();
}
