(() => {
  const ROOT_SELECTOR = "#mobile-cast-view";
  const LEVEL_SELECTORS = [
    ".mobile-skill-row > b",
    ".mobile-style-row > b"
  ].join(",");
  const META_LABELS = {
    PLAYER: ["プレイヤー", "PLAYER"],
    AFFILIATION: ["所属", "AFFILIATION"],
    RANK: ["市民ランク", "CITIZEN RANK"],
    EXP: ["消費経験点", "EXP SPENT"]
  };
  const PROFILE_LABELS = {
    年齢: ["年齢", "AGE"], 性別: ["性別", "GENDER"], 身長: ["身長", "HEIGHT"], 体重: ["体重", "WEIGHT"],
    瞳: ["瞳", "EYES"], 髪: ["髪", "HAIR"], 肌: ["肌", "SKIN"]
  };
  const LIFE_PATH_LABELS = {
    出自: ["出自", "ORIGIN"], 経験: ["経験", "EXPERIENCE"], 邂逅: ["邂逅", "ENCOUNTER"]
  };

  function apply(root = document) {
    let updated = 0;
    root.querySelectorAll?.(LEVEL_SELECTORS).forEach(element => {
      if (element.dataset.mobileLevelLabel === "1") return;
      const value = String(element.textContent || "").trim();
      if (!value) return;
      element.textContent = `Lv${value.replace(/^Lv\s*/i, "")}`;
      element.dataset.mobileLevelLabel = "1";
      updated += 1;
    });
    return updated;
  }

  function bilingualLabel(element, japanese, english) {
    if (!element || element.dataset.mobileBilingualLabel === "1") return;
    element.replaceChildren(document.createTextNode(japanese));
    const small = document.createElement("small");
    small.textContent = english;
    element.append(small);
    element.dataset.mobileBilingualLabel = "1";
  }

  function findProfileSection(root) {
    return [...root.querySelectorAll(".mobile-cast-section")].find(section => {
      return String(section.querySelector(".mobile-cast-section__title h2")?.textContent || "").trim() === "プロフィール";
    }) || null;
  }

  function ensureProfileSection(root) {
    let section = findProfileSection(root);
    if (section) return section;
    const main = root.querySelector(".mobile-cast-main");
    if (!main) return null;
    section = document.createElement("section");
    section.className = "mobile-cast-section mobile-cast-profile-section";
    section.innerHTML = '<header class="mobile-cast-section__title"><h2>プロフィール</h2><small>PROFILE</small></header>';
    const before = main.querySelector(".mobile-core-skills, .mobile-cast-section:nth-of-type(3)");
    if (before) main.insertBefore(section, before); else main.append(section);
    return section;
  }

  function enhanceStaticLabels(root) {
    root.querySelectorAll(".mobile-cast-meta dt").forEach(dt => {
      const key = String(dt.textContent || "").trim().toUpperCase();
      const labels = META_LABELS[key];
      if (labels) bilingualLabel(dt, ...labels);
    });
    root.querySelectorAll(".mobile-cast-profile-grid dt").forEach(dt => {
      const labels = PROFILE_LABELS[String(dt.textContent || "").trim()];
      if (labels) bilingualLabel(dt, ...labels);
    });
    root.querySelectorAll(".mobile-cast-lifepath p > span").forEach(span => {
      const labels = LIFE_PATH_LABELS[String(span.textContent || "").trim()];
      if (labels) bilingualLabel(span, ...labels);
    });
  }

  function makeSubheading(japanese, english, className) {
    const header = document.createElement("div");
    header.className = `mobile-cast-profile-subheading ${className || ""}`.trim();
    const strong = document.createElement("strong");
    strong.textContent = japanese;
    const small = document.createElement("small");
    small.textContent = english;
    header.append(strong, small);
    return header;
  }

  function makeSourceHeading(href) {
    const header = document.createElement("div");
    header.className = "mobile-cast-profile-subheading mobile-cast-source-heading";
    const link = document.createElement("a");
    link.className = "mobile-cast-source-heading-link";
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.characterSheetLink = "1";
    const strong = document.createElement("strong");
    strong.textContent = "キャラクターシート倉庫";
    const small = document.createElement("small");
    small.textContent = "CHARACTER SHEETS";
    link.append(strong, small);
    header.append(link);
    return header;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function showComparison(summaries) {
    document.querySelector("#mobile-character-sheet-compare-dialog")?.remove();
    const dialog = document.createElement("dialog");
    dialog.id = "mobile-character-sheet-compare-dialog";
    dialog.className = "mobile-character-sheet-compare-dialog";
    const body = summaries.length
      ? `<p>キャラクターシート倉庫と比較し、CAST ARCHIVE側に次の差分があります。</p><ul>${summaries.map(summary => `<li>${escapeHtml(summary)}</li>`).join("")}</ul>`
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
      const [{ getCharacter, getSkills, getOutfits }, { compareCharacterSheetSource }, diffDisplay] = await Promise.all([
        import("./cast-data-store.js"),
        import("./character-sheet-compare-service.js?v=1"),
        import("./character-sheet-diff-display.js?v=3")
      ]);
      const [character, skills, outfits] = await Promise.all([getCharacter(), getSkills(), getOutfits()]);
      const differences = await compareCharacterSheetSource(sourceUrl, { character, skills, outfits });
      const summaries = diffDisplay.summarizeCharacterSheetDifferences(
        diffDisplay.groupCharacterSheetDifferences(differences)
      );
      showComparison(summaries);
    } catch (error) {
      console.error("mobile character sheet comparison failed", error);
      alert(`差分比較に失敗しました：${error?.message || error}`);
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  }

  function makeCompareButton(sourceUrl) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mobile-cast-source-compare";
    button.innerHTML = "<span>倉庫との差分を確認</span><small>COMPARE</small>";
    button.addEventListener("click", () => startComparison(button, sourceUrl));
    return button;
  }

  async function enhanceProfile(root) {
    if (!root.querySelector(".mobile-cast-main")) return;
    const currentSection = findProfileSection(root);
    if (root.dataset.mobileProfileAligned === "pending") return;
    if (root.dataset.mobileProfileAligned === "1" && currentSection?.dataset.mobileProfileEnhanced === "1") {
      enhanceStaticLabels(root);
      return;
    }
    root.dataset.mobileProfileAligned = "pending";
    try {
      const [{ getCharacter }, { normalizeCharacterSheetUrl }] = await Promise.all([
        import("./cast-data-store.js"),
        import("./character-sheet-url.js?v=2")
      ]);
      const character = await getCharacter();
      if (!character) return;
      const section = ensureProfileSection(root);
      if (!section) return;
      section.classList.add("mobile-cast-profile-section");
      const sectionHeader = section.querySelector(".mobile-cast-section__title");

      enhanceStaticLabels(root);

      const summary = root.querySelector(".mobile-cast-summary");
      if (summary && !section.querySelector(".mobile-cast-tagline-panel")) {
        const panel = document.createElement("div");
        panel.className = "mobile-cast-profile-item mobile-cast-tagline-panel";
        panel.append(makeSubheading("一言", "TAGLINE", "mobile-cast-tagline-heading"), summary);
        sectionHeader?.after(panel);
      }

      const normalizedUrl = normalizeCharacterSheetUrl(character.character_sheet_url);
      if (normalizedUrl && !section.querySelector(".mobile-cast-source-panel")) {
        const panel = document.createElement("div");
        panel.className = "mobile-cast-profile-item mobile-cast-source-panel";
        panel.append(makeSourceHeading(normalizedUrl), makeCompareButton(normalizedUrl));
        const taglinePanel = section.querySelector(".mobile-cast-tagline-panel");
        if (taglinePanel) taglinePanel.after(panel); else sectionHeader?.after(panel);
      }

      const profileText = section.querySelector(".mobile-cast-profile-text");
      if (profileText && !profileText.previousElementSibling?.classList.contains("mobile-cast-background-heading")) {
        const heading = makeSubheading("背景設定", "BACKGROUND", "mobile-cast-background-heading");
        profileText.before(heading);
      }

      section.dataset.mobileProfileEnhanced = "1";
      root.dataset.mobileProfileAligned = "1";
    } catch (error) {
      root.dataset.mobileProfileAligned = "error";
      console.error("mobile profile alignment failed", error);
    }
  }

  function initialize() {
    const root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;
    apply(root);
    enhanceProfile(root);
    const observer = new MutationObserver(() => {
      apply(root);
      const section = findProfileSection(root);
      if (root.dataset.mobileProfileAligned !== "1" || section?.dataset.mobileProfileEnhanced !== "1") enhanceProfile(root);
      else enhanceStaticLabels(root);
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();

import("./cast-troops-link.js?v=2").catch(error => {
  console.error("cast troop navigation failed to load", error);
});