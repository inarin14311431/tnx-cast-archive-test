import { getCharacter, getSkills, getOutfits } from "./cast-data-store.js";
import { normalizeCharacterSheetUrl, buildCharacterSheetReadUrl, extractCharacterSheetKey } from "./character-sheet-url.js?v=2";
import { canonicalizeArchiveBundle, canonicalizeCharacterSheetJsonp, diffCanonicalBundles } from "./character-sheet-jsonp-canonical.js?v=2";
import { groupCharacterSheetDifferences, summarizeCharacterSheetDifferences } from "./character-sheet-diff-display.js?v=3";

const ROOT_SELECTOR = "#mobile-cast-view";
const STYLE_CODE_NAMES = new Map([["0","カブキ"],["1","バサラ"],["2","タタラ"],["3","ミストレス"],["4","カブト"],["5","カリスマ"],["6","マネキン"],["7","カゼ"],["8","フェイト"],["9","クロマク"],["10","エグゼク"],["11","カタナ"],["12","クグツ"],["13","カゲ"],["14","チャクラ"],["15","レッガー"],["16","カブトワリ"],["17","ハイランダー"],["18","マヤカシ"],["19","トーキー"],["20","イヌ"],["21","ニューロ"],["-0","コモン"],["-1","ヒルコ"],["-2","クロガネ"],["-4","イブキ"],["-6","シキガミ"],["-7","アラシ"],["-9","カゲムシャ"],["-12","ミギウデ"],["-17","エトランゼ"],["-18","アヤカシ"],["-21","ウツワ"]]);

function splitLifePath(value) {
  const text = String(value || "").trim();
  const angle = text.match(/^(.*?)(?:[：:]\s*)?[＜<]\s*([^＜<>＞]+?)\s*[＞>]+\s*$/);
  if (angle) return { name: angle[1].replace(/[：:]\s*$/, "").trim(), skill: angle[2].trim() };
  const round = text.match(/^(.*?)[（(]([^（）()]*)[）)]\s*$/);
  return round ? { name: round[1].trim(), skill: round[2].trim() } : { name: text, skill: "" };
}

function normalizeLifePathDisplay(root) {
  root.querySelectorAll(".mobile-cast-lifepath p").forEach(row => {
    if (row.dataset.mobileLifePathSplit === "1") return;
    const value = row.querySelector("b");
    if (!value) return;
    const detail = splitLifePath(value.textContent);
    if (!detail.skill) return;
    value.textContent = detail.name || "—";
    const skill = document.createElement("em");
    skill.className = "mobile-cast-lifepath-skill";
    skill.textContent = detail.skill;
    row.append(skill);
    row.dataset.mobileLifePathSplit = "1";
  });
}

function removeDuplicateSourceLink(root) {
  root.querySelectorAll(".mobile-cast-character-sheet-link,[data-character-sheet-link='1']").forEach(element => element.remove());
}

function rebuildSourcePanel(root, href) {
  const panel = root.querySelector(".mobile-cast-source-panel");
  if (!panel || panel.dataset.mobileSourceTools === "1") return Boolean(panel);
  const heading = panel.querySelector(".mobile-cast-profile-subheading");
  if (!heading) return false;

  heading.replaceChildren();
  const link = document.createElement("a");
  link.className = "mobile-cast-source-heading-link";
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const strong = document.createElement("strong");
  strong.textContent = "キャラクターシート倉庫";
  const small = document.createElement("small");
  small.textContent = "CHARACTER SHEETS";
  link.append(strong, small);
  heading.append(link);
  panel.querySelector(".mobile-cast-source-link")?.remove();

  const compare = document.createElement("button");
  compare.type = "button";
  compare.className = "mobile-cast-source-compare";
  compare.innerHTML = "<span>倉庫との差分を確認</span><small>COMPARE</small>";
  compare.addEventListener("click", () => startComparison(compare, href));
  panel.append(compare);
  panel.dataset.mobileSourceTools = "1";
  return true;
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

function jsonpOnce(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const callback = `__tnxMobileCompare_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
    const timer = setTimeout(() => finish(reject, new Error("キャラクターシート倉庫の応答がタイムアウトしました。")), timeout);
    window[callback] = value => finish(resolve, value);
    script.onerror = () => finish(reject, new Error("キャラクターシート倉庫のデータ取得に失敗しました。"));
    const request = new URL(url);
    request.searchParams.set("callback", callback);
    script.src = request.href;
    document.head.append(script);
  });
}

async function fetchCharacterSheetPayload(sourceUrl) {
  const primary = buildCharacterSheetReadUrl(sourceUrl);
  const key = extractCharacterSheetKey(sourceUrl);
  if (!primary || !key) throw new Error("キャラクターシート倉庫URLを解析できませんでした。");
  const encoded = encodeURIComponent(key);
  const urls = [primary, `https://character-sheets.appspot.com/tnx/display.html?ajax=1&key=${encoded}`, `https://character-sheets.appspot.com/tnx/display?key=${encoded}&ajax=1`, `https://character-sheets.appspot.com/tnx/display.html?key=${encoded}&ajax=1`];
  let lastError;
  for (const url of urls) {
    try { return normalizePayload(await jsonpOnce(url)); } catch (error) { lastError = error; }
  }
  throw lastError || new Error("キャラクターシート倉庫からデータを取得できませんでした。");
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function showComparison(summaries) {
  document.querySelector("#mobile-character-sheet-compare-dialog")?.remove();
  const dialog = document.createElement("dialog");
  dialog.id = "mobile-character-sheet-compare-dialog";
  dialog.className = "mobile-character-sheet-compare-dialog";
  const body = summaries.length
    ? `<p>キャラクターシート倉庫と比較し、CAST ARCHIVE側に次の差分があります。</p><ul>${summaries.map(summary => `<li>${esc(summary)}</li>`).join("")}</ul>`
    : "<p>差分はありません。CAST ARCHIVEとキャラクターシート倉庫は一致しています。</p>";
  dialog.innerHTML = `<form method="dialog"><header><div><strong>キャラクターシート倉庫との差分</strong><small>CHARACTER SHEETS COMPARISON</small></div><button value="close" aria-label="閉じる">×</button></header><div class="mobile-character-sheet-compare-dialog__body">${body}</div><footer><button value="close">閉じる</button></footer></form>`;
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.showModal();
}

async function startComparison(button, sourceUrl) {
  if (button.disabled) return;
  button.disabled = true;
  const original = button.innerHTML;
  button.innerHTML = "<span>比較中…</span><small>COMPARING</small>";
  try {
    const [character, skills, outfits, externalPayload] = await Promise.all([
      getCharacter(), getSkills(), getOutfits(), fetchCharacterSheetPayload(sourceUrl)
    ]);
    const archiveBundle = { character, skills, outfits };
    const differences = diffCanonicalBundles(canonicalizeArchiveBundle(archiveBundle), canonicalizeCharacterSheetJsonp(externalPayload));
    const summaries = summarizeCharacterSheetDifferences(groupCharacterSheetDifferences(differences));
    showComparison(summaries);
  } catch (error) {
    console.error("mobile character sheet comparison failed", error);
    alert(`差分比較に失敗しました：${error?.message || error}`);
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

async function applyTools(root) {
  normalizeLifePathDisplay(root);
  removeDuplicateSourceLink(root);
  const character = await getCharacter();
  const href = normalizeCharacterSheetUrl(character?.character_sheet_url);
  if (!href) return;
  rebuildSourcePanel(root, href);
}

function initialize() {
  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) return;
  let running = false;
  const apply = () => {
    if (running) return;
    running = true;
    Promise.resolve(applyTools(root)).catch(error => console.error("mobile Character Sheets tools failed", error)).finally(() => { running = false; });
  };
  apply();
  new MutationObserver(apply).observe(root, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
else initialize();
