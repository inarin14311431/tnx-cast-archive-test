/* Paper-play adjustments for the quick sheet. Keeps cast.js data/rendering responsibilities intact. */
(function () {
  const pages = document.querySelector("#quick-sheet-pages");
  if (!pages) return;

  const OUTFIT_ORDER = ["weapons", "armor", "cyberware", "tron", "vehicle", "residence", "other"];

  function paperCounter(limit) {
    const count = Math.max(0, Number(limit) || 0);
    if (!count) return "";
    return `<span class="quick-sheet__paper-counter" aria-label="使用回数 ${count} 回">${Array.from({ length: count }, () => "<i aria-hidden=\"true\"></i>").join("")}</span>`;
  }

  function convertCounters(root) {
    root.querySelectorAll(".quick-sheet__combo-card.is-counter").forEach(card => {
      const status = card.querySelector("header > b");
      if (!status || status.querySelector(".quick-sheet__paper-counter")) return;
      const text = status.textContent.trim();
      const match = text.match(/(?:\d+\s*\/\s*)?(\d+)/);
      if (!match) return;
      status.innerHTML = paperCounter(match[1]);
      status.classList.add("is-paper-counter");
    });
  }

  function getOtherGroups(section) {
    const groups = new Map();
    section?.querySelectorAll("[data-quick-outfit-category]").forEach(group => {
      groups.set(group.dataset.quickOutfitCategory, group);
    });
    return groups;
  }

  function reorderPageTwo(root) {
    const pageTwo = root.querySelector(".quick-sheet__page--two");
    if (!pageTwo) return;
    const footer = pageTwo.querySelector(".quick-sheet__page-footer");
    if (!footer) return;

    const styleSkills = root.querySelector('[data-quick-sheet-section="style-skills"]');
    const weapons = root.querySelector('[data-quick-sheet-section="weapons"]');
    const armor = root.querySelector('[data-quick-sheet-section="armor"]');
    const otherSection = root.querySelector('[data-quick-sheet-section="other-outfits"]');
    const groups = getOtherGroups(otherSection);
    const combos = root.querySelector(".quick-sheet__combos");

    // Core skill data first, then outfits in play-reference order.
    if (styleSkills) pageTwo.insertBefore(styleSkills, footer);
    if (weapons) pageTwo.insertBefore(weapons, footer);
    if (armor) pageTwo.insertBefore(armor, footer);

    // Move each registered outfit group independently so its order is deterministic.
    for (const category of OUTFIT_ORDER.slice(2)) {
      const group = groups.get(category);
      if (group) pageTwo.insertBefore(group, footer);
    }

    // Empty wrapper is unnecessary after its groups have been distributed.
    if (otherSection && !otherSection.querySelector("[data-quick-outfit-category]")) otherSection.remove();

    // Combos / paper counters are always the final play section.
    if (combos) pageTwo.insertBefore(combos, footer);
  }

  function normalize(root) {
    convertCounters(root);
    reorderPageTwo(root);
  }

  const observer = new MutationObserver(() => {
    queueMicrotask(() => normalize(pages));
  });
  observer.observe(pages, { childList: true, subtree: true });
  normalize(pages);
})();
