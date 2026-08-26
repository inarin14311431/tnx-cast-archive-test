(() => {
  const list = document.querySelector("#act-history-list");
  if (!list) return;

  function normalizeRecord(record) {
    const ruler = record.querySelector(":scope > .act-record__ruler");
    if (ruler) {
      const normalized = String(ruler.textContent || "").replace(/^\s*RULER\s*[:：]\s*/i, "").trim() || "—";
      if (ruler.textContent !== normalized) ruler.textContent = normalized;
    }

    const title = record.querySelector(".act-record__title");
    const showcaseLink = title?.querySelector("a[href]");
    record.classList.toggle("has-showcase-link", Boolean(showcaseLink));
    if (showcaseLink) {
      showcaseLink.classList.add("act-record__showcase-link");
      showcaseLink.setAttribute("aria-label", `${showcaseLink.textContent.trim()} のアクト紹介を開く`);
      showcaseLink.title = "公開アクト紹介を開く";
    }
  }

  function normalizeAll(root = list) {
    if (root instanceof Element && root.matches(".act-record")) normalizeRecord(root);
    root.querySelectorAll?.(".act-record").forEach(normalizeRecord);
  }

  normalizeAll();
  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) normalizeAll(node);
      });
    }
  }).observe(list, { childList: true, subtree: true });
})();
