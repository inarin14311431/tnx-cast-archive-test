(() => {
  const story = document.querySelector("#showcase-story");
  if (!story) return;

  const buildCode = value => {
    const source = String(value || "PUBLIC CAST");
    let hash = 2166136261;
    for (const character of source) {
      hash ^= character.codePointAt(0) || 0;
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    const hex = hash.toString(16).toUpperCase().padStart(8, "0");
    return `VISUAL TRACE // NX-${hex.slice(0, 4)}-${hex.slice(4)} // NODE:PUBLIC`;
  };

  const decorate = root => {
    const scope = root?.querySelectorAll ? root : document;
    for (const caption of scope.querySelectorAll(".poster-v2-visual__caption")) {
      const strong = caption.querySelector("strong");
      if (!strong || strong.dataset.visualCodeApplied === "true") continue;
      const grid = caption.closest(".poster-v2-grid");
      const publicName = grid?.querySelector(".poster-v2-name")?.textContent || strong.textContent || "PUBLIC CAST";
      strong.textContent = buildCode(publicName);
      strong.classList.add("poster-v2-visual__code");
      strong.dataset.visualCodeApplied = "true";
      strong.setAttribute("aria-label", "公開ビジュアル識別コード");
    }
  };

  decorate(story);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.(".poster-v2-visual__caption")) decorate(node.parentElement || node);
        else if (node.querySelector?.(".poster-v2-visual__caption")) decorate(node);
      }
    }
  });
  observer.observe(story, { childList: true, subtree: true });
})();
