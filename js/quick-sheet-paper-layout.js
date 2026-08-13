/* Paper-play adjustments for the quick sheet. Keeps cast.js data/rendering responsibilities intact. */
(function () {
  const pages = document.querySelector("#quick-sheet-pages");
  if (!pages) return;

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

  function reorderPageTwo(root) {
    const pageTwo = root.querySelector(".quick-sheet__page--two");
    if (!pageTwo) return;
    const footer = pageTwo.querySelector(".quick-sheet__page-footer");
    if (!footer) return;

    const styleSkills = root.querySelector('[data-quick-sheet-section="style-skills"]');
    const weapons = root.querySelector('[data-quick-sheet-section="weapons"]');
    const armor = root.querySelector('[data-quick-sheet-section="armor"]');
    const otherOutfits = root.querySelector('[data-quick-sheet-section="other-outfits"]');
    const combos = root.querySelector(".quick-sheet__combos");

    // Registered outfit groups inside otherOutfits are already ordered as:
    // cyberware, tron, vehicle, residence, other.
    if (styleSkills) pageTwo.insertBefore(styleSkills, footer);
    if (weapons) pageTwo.insertBefore(weapons, footer);
    if (armor) pageTwo.insertBefore(armor, footer);
    if (otherOutfits) pageTwo.insertBefore(otherOutfits, footer);

    // Combos / paper counters are the final play section.
    if (combos) pageTwo.insertBefore(combos, footer);
  }

  function normalize(root) {
    convertCounters(root);
    reorderPageTwo(root);
  }

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      normalize(pages);
    });
  });
  observer.observe(pages, { childList: true, subtree: true });
  normalize(pages);
})();
