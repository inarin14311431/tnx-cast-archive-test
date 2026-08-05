(() => {
  const PREVIEW_CLASS = "cast-print-preview";

  function setPreview(enabled) {
    document.body.classList.toggle(PREVIEW_CLASS, enabled);
    document.getElementById("cast-print-preview-button")?.toggleAttribute("hidden", enabled);
    document.getElementById("cast-print-button")?.toggleAttribute("hidden", !enabled);
    document.getElementById("cast-print-exit-button")?.toggleAttribute("hidden", !enabled);
    document.querySelectorAll(".cast-tab-panel[data-panel]").forEach(panel => {
      if (enabled) panel.dataset.printExpanded = "true";
      else delete panel.dataset.printExpanded;
    });
    document.querySelectorAll("#cast-content .data-panel").forEach(panel => {
      if (enabled) {
        panel.dataset.printWasCollapsed = String(panel.classList.contains("is-collapsed"));
        panel.classList.remove("is-collapsed");
        panel.querySelector(":scope > .data-panel__header")?.setAttribute("aria-expanded", "true");
      } else if (panel.dataset.printWasCollapsed) {
        const wasCollapsed = panel.dataset.printWasCollapsed === "true";
        panel.classList.toggle("is-collapsed", wasCollapsed);
        panel.querySelector(":scope > .data-panel__header")?.setAttribute("aria-expanded", String(!wasCollapsed));
        delete panel.dataset.printWasCollapsed;
      }
    });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  document.addEventListener("click", event => {
    if (event.target.closest("#cast-print-preview-button")) setPreview(true);
    if (event.target.closest("#cast-print-exit-button")) setPreview(false);
    if (event.target.closest("#cast-print-button")) window.print();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.body.classList.contains(PREVIEW_CLASS)) setPreview(false);
  });

  window.addEventListener("beforeprint", () => document.body.classList.add("cast-printing"));
  window.addEventListener("afterprint", () => document.body.classList.remove("cast-printing"));
})();
