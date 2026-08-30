(function(){
  const grid = document.querySelector("#cast-grid");
  const formatter = window.TNXArchiveId?.format;
  if (!grid || typeof formatter !== "function") return;

  const apply = root => {
    const matchesSerial = typeof root.matches === "function" && root.matches(".cast-card__serial");
    const descendants = typeof root.querySelectorAll === "function"
      ? [...root.querySelectorAll(".cast-card__serial")]
      : [];
    const elements = matchesSerial ? [root] : descendants;
    for (const element of elements) {
      const current = element.textContent.trim();
      if (!current || /^TNX-[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}$/.test(current)) continue;
      element.textContent = formatter(current);
    }
  };

  apply(grid);
  new MutationObserver(mutations => {
    for (const mutation of mutations) mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) apply(node);
    });
  }).observe(grid, { childList: true, subtree: true });
})();
