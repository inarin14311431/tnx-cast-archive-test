import { supabase } from "./supabase-client.js";
import { SITE_BASE_PATH } from "./config.js?v=2";

const VISIBILITIES = new Set(["public", "unlisted", "private"]);
const UNLISTED_LABEL = "限定公開 / UNLISTED";
let currentCharacter = null;
let currentShareToken = "";
let loadingShareToken = false;

function normalizeVisibility(value) {
  return VISIBILITIES.has(String(value || "")) ? String(value) : "private";
}

function getVisibilitySelects() {
  return [
    document.querySelector("#visibility"),
    document.querySelector('[data-mobile-character-field="visibility"]'),
    document.querySelector("#mobile-global-visibility")
  ].filter(Boolean);
}

function ensureUnlistedOption(select) {
  if (!select || [...select.options].some(option => option.value === "unlisted")) return;
  const option = document.createElement("option");
  option.value = "unlisted";
  option.textContent = UNLISTED_LABEL;
  const privateOption = [...select.options].find(item => item.value === "private");
  select.insertBefore(option, privateOption || null);
}

function currentVisibility() {
  const source = document.querySelector("#visibility")
    || document.querySelector('[data-mobile-character-field="visibility"]')
    || document.querySelector("#mobile-global-visibility");
  return normalizeVisibility(source?.value);
}

function buildShareUrl(publicId, shareToken) {
  if (!publicId || !shareToken) return "";
  const url = new URL(`${SITE_BASE_PATH}cast.html`, window.location.origin);
  url.searchParams.set("id", publicId);
  url.searchParams.set("share", shareToken);
  return url.toString();
}

function injectStyles() {
  if (document.querySelector("#tnx-character-share-style")) return;
  const style = document.createElement("style");
  style.id = "tnx-character-share-style";
  style.textContent = `
    .character-share-panel{margin:.75rem 0;padding:.8rem;border:1px solid currentColor;border-radius:.35rem;background:rgba(0,0,0,.12)}
    .character-share-panel[hidden]{display:none!important}
    .character-share-panel strong{display:block;font-size:.88rem}
    .character-share-panel small{display:block;opacity:.72;font-size:.68rem;letter-spacing:.06em}
    .character-share-panel p{margin:.4rem 0;font-size:.76rem;line-height:1.5}
    .character-share-panel__controls{display:flex;gap:.45rem;align-items:stretch}
    .character-share-panel__controls input{min-width:0;flex:1;font-size:.72rem}
    .character-share-panel__controls button{flex:0 0 auto;white-space:nowrap}
    .character-share-panel__status{min-height:1.2em;opacity:.8}
    .mobile-sheet-actions .character-share-panel{flex:1 1 100%;width:100%;box-sizing:border-box}
    @media (max-width:720px){.character-share-panel__controls{flex-direction:column}.character-share-panel__controls button{min-height:44px}}
  `;
  document.head.append(style);
}

function findPanelHost() {
  const mobileActions = document.querySelector(".mobile-sheet-actions");
  if (mobileActions) return { host: mobileActions, before: document.querySelector("#mobile-save") };
  const visibility = document.querySelector("#visibility");
  const label = visibility?.closest("label");
  return label?.parentElement ? { host: label.parentElement, before: label.nextSibling } : null;
}

function ensurePanel() {
  let panel = document.querySelector("#character-share-panel");
  if (panel) return panel;
  const target = findPanelHost();
  if (!target) return null;

  panel = document.createElement("section");
  panel.id = "character-share-panel";
  panel.className = "character-share-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <strong>限定公開URL <small>UNLISTED SHARE LINK</small></strong>
    <p>URLを知っている人のみ閲覧できます。一覧・検索には表示されません。</p>
    <div class="character-share-panel__controls">
      <input id="character-share-url" type="url" readonly aria-label="限定公開URL">
      <button id="character-share-copy" type="button">URLをコピー</button>
    </div>
    <p id="character-share-status" class="character-share-panel__status" aria-live="polite"></p>
  `;
  target.host.insertBefore(panel, target.before || null);
  panel.querySelector("#character-share-copy")?.addEventListener("click", copyShareUrl);
  return panel;
}

function setStatus(message) {
  const element = document.querySelector("#character-share-status");
  if (element) element.textContent = message || "";
}

function renderPanel() {
  getVisibilitySelects().forEach(ensureUnlistedOption);
  const panel = ensurePanel();
  if (!panel) return;
  const isUnlisted = currentVisibility() === "unlisted";
  panel.hidden = !isUnlisted;
  if (!isUnlisted) return;

  const input = panel.querySelector("#character-share-url");
  const button = panel.querySelector("#character-share-copy");
  const url = buildShareUrl(currentCharacter?.public_id, currentShareToken);
  if (input) input.value = url;
  if (button) button.disabled = !url;

  if (url) setStatus("このURLを共有すると、限定公開キャストを閲覧できます。");
  else if (currentCharacter?.id && loadingShareToken) setStatus("共有URLを取得しています…");
  else if (currentCharacter?.id) setStatus("共有URLを取得できませんでした。保存後に再読み込みしてください。");
  else setStatus("キャストを保存すると共有URLが発行されます。");
}

async function fetchShareToken(character) {
  currentCharacter = character || currentCharacter;
  currentShareToken = "";
  if (!currentCharacter?.id) {
    renderPanel();
    return;
  }

  loadingShareToken = true;
  renderPanel();
  try {
    const { data, error } = await supabase
      .from("character_share_links")
      .select("share_token")
      .eq("character_id", currentCharacter.id)
      .maybeSingle();
    if (error) throw error;
    currentShareToken = data?.share_token || "";
  } catch (error) {
    console.error("Share link could not be loaded.", error);
    currentShareToken = "";
  } finally {
    loadingShareToken = false;
    renderPanel();
  }
}

async function loadCharacterFromLocation() {
  const publicId = new URLSearchParams(window.location.search).get("id")?.trim();
  if (!publicId) {
    renderPanel();
    return;
  }
  try {
    const { data, error } = await supabase
      .from("characters")
      .select("id,public_id,visibility")
      .eq("public_id", publicId)
      .maybeSingle();
    if (error) throw error;
    if (data) await fetchShareToken(data);
  } catch (error) {
    console.error("Character share context could not be loaded.", error);
    renderPanel();
  }
}

async function copyShareUrl() {
  const input = document.querySelector("#character-share-url");
  const text = input?.value?.trim();
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      input.focus();
      input.select();
      if (!document.execCommand("copy")) throw new Error("copy failed");
    }
    setStatus("共有URLをコピーしました。");
  } catch (error) {
    console.error(error);
    setStatus("コピーに失敗しました。URL欄から手動でコピーしてください。");
  }
}

function syncVisibilityValue(value) {
  const normalized = normalizeVisibility(value);
  for (const select of getVisibilitySelects()) {
    ensureUnlistedOption(select);
    if (select.value !== normalized) select.value = normalized;
  }
  renderPanel();
}

function bindEvents() {
  document.addEventListener("change", event => {
    const select = event.target.closest?.("#visibility, [data-mobile-character-field=\"visibility\"], #mobile-global-visibility");
    if (select) event.__tnxVisibilityValue = normalizeVisibility(select.value);
  }, true);

  document.addEventListener("change", event => {
    const value = event.__tnxVisibilityValue;
    if (!value) return;
    queueMicrotask(() => syncVisibilityValue(value));
  });

  window.addEventListener("tnx:character-saved", event => {
    const detail = event.detail || {};
    fetchShareToken({
      ...(currentCharacter || {}),
      id: detail.id || currentCharacter?.id,
      public_id: detail.publicId || currentCharacter?.public_id,
      visibility: currentVisibility()
    });
  });

  document.addEventListener("tnx:mobile-profile-loaded", event => {
    const character = event.detail?.character;
    if (character?.id) fetchShareToken(character);
    else renderPanel();
  });

  const observer = new MutationObserver(() => {
    getVisibilitySelects().forEach(ensureUnlistedOption);
    ensurePanel();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function init() {
  if (window.__TNXCharacterShareEditorInitialized) return;
  window.__TNXCharacterShareEditorInitialized = true;
  injectStyles();
  getVisibilitySelects().forEach(ensureUnlistedOption);
  ensurePanel();
  bindEvents();
  loadCharacterFromLocation();
  renderPanel();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();