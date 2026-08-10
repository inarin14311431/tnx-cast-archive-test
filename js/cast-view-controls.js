(() => {
  const TAB_SELECTOR = ".cast-tab[data-tab]";
  const PANEL_SELECTOR = ".cast-tab-panel[data-panel]";

  function activateTab(tabName, options = {}) {
    const tabs = [...document.querySelectorAll(TAB_SELECTOR)];
    const panels = [...document.querySelectorAll(PANEL_SELECTOR)];
    const targetTab = tabs.find(tab => tab.dataset.tab === tabName);
    const targetPanel = panels.find(panel => panel.dataset.panel === tabName);
    if (!targetTab || !targetPanel) return false;

    tabs.forEach(tab => {
      const active = tab === targetTab;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    panels.forEach(panel => {
      const active = panel === targetPanel;
      panel.classList.toggle("is-active", active);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-hidden", String(!active));
    });

    document.querySelector(".cast-tab-list")?.setAttribute("role", "tablist");
    if (options.focus) targetTab.focus();
    return true;
  }

  function initializeTabs() {
    const selected = document.querySelector(`${TAB_SELECTOR}.is-active`)?.dataset.tab;
    activateTab(selected || "session");
  }

  document.addEventListener("click", event => {
    const jump = event.target.closest('[data-cast-jump="combo"]');
    if (jump) {
      event.preventDefault();
      activateTab("session");
      requestAnimationFrame(() => {
        document.querySelector("#cast-combo-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    const tab = event.target.closest(TAB_SELECTOR);
    if (!tab) return;
    event.preventDefault();
    activateTab(tab.dataset.tab);
  });

  document.addEventListener("keydown", event => {
    const current = event.target.closest(TAB_SELECTOR);
    if (!current || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    const tabs = [...document.querySelectorAll(TAB_SELECTOR)];
    const currentIndex = tabs.indexOf(current);
    if (currentIndex < 0 || !tabs.length) return;

    event.preventDefault();
    let nextIndex = currentIndex;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    activateTab(tabs[nextIndex].dataset.tab, { focus: true });
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeTabs, { once: true });
  else initializeTabs();
})();

(() => {
  const panel = document.querySelector("#cast-summary-panel");
  const summary = document.querySelector("#cast-summary");
  const toggle = document.querySelector("#cast-summary-toggle");
  const hero = document.querySelector(".cast-hero");
  if (!panel || !summary || !toggle) return;

  let measureFrame = 0;

  function setExpanded(expanded) {
    panel.classList.toggle("is-expanded", expanded);
    hero?.classList.toggle("is-summary-expanded", expanded);
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.innerHTML = expanded
      ? "<span>折りたたむ</span><small>COLLAPSE</small>"
      : "<span>全文表示</span><small>EXPAND</small>";
  }

  function measure() {
    measureFrame = 0;
    const hasSummary = Boolean(summary.textContent.trim());
    panel.hidden = !hasSummary;
    if (!hasSummary) {
      setExpanded(false);
      toggle.hidden = true;
      return;
    }
    if (panel.classList.contains("is-expanded")) {
      toggle.hidden = false;
      return;
    }
    toggle.hidden = summary.scrollHeight <= summary.clientHeight + 1;
  }

  function scheduleMeasure() {
    if (measureFrame) cancelAnimationFrame(measureFrame);
    measureFrame = requestAnimationFrame(measure);
  }

  toggle.addEventListener("click", () => {
    setExpanded(!panel.classList.contains("is-expanded"));
    scheduleMeasure();
  });

  new MutationObserver(() => {
    setExpanded(false);
    scheduleMeasure();
  }).observe(summary, { childList: true, characterData: true, subtree: true });

  window.addEventListener("resize", scheduleMeasure, { passive: true });
  scheduleMeasure();
})();

(() => {
  const root = document.querySelector("#cast-content");
  if (!root) return;

  function setupPanel(panel) {
    if (panel.dataset.collapseReady) return;
    const header = panel.querySelector(":scope > .data-panel__header");
    if (!header) return;

    header.setAttribute("role", "button");
    header.tabIndex = 0;
    header.setAttribute("aria-expanded", "true");

    const toggle = () => {
      const collapsed = panel.classList.toggle("is-collapsed");
      header.setAttribute("aria-expanded", String(!collapsed));
    };

    header.addEventListener("click", toggle);
    header.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });

    panel.dataset.collapseReady = "1";
  }

  const setup = () => {
    document.querySelectorAll("#tab-session .data-panel, #tab-outfits .data-panel, #tab-profile .data-panel")
      .forEach(setupPanel);
  };

  new MutationObserver(setup).observe(root, { childList: true, subtree: true });
  setup();
})();

(() => {
  const publicIdElement = document.querySelector("#cast-public-id");
  const statusElement = document.querySelector("#cast-status");
  const accessTargetElement = document.querySelector(".cast-access-target");
  const sourceId = new URLSearchParams(window.location.search).get("id")?.trim() ?? "";
  if (!sourceId) return;

  const displayId = obfuscatePublicId(sourceId);
  let updating = false;

  function obfuscatePublicId(value) {
    const source = `TNX_CAST_ARCHIVE::${String(value ?? "")}`;
    let hash = 0x811c9dc5;
    for (let index = 0; index < source.length; index++) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return `TNX-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  }

  function replaceVisibleId(element) {
    if (!element?.textContent.includes(sourceId)) return;
    element.textContent = element.textContent.replaceAll(sourceId, displayId);
  }

  function refreshDisplay() {
    if (updating) return;
    updating = true;
    if (publicIdElement && publicIdElement.textContent !== displayId) publicIdElement.textContent = displayId;
    replaceVisibleId(statusElement);
    replaceVisibleId(accessTargetElement);
    updating = false;
  }

  const observer = new MutationObserver(refreshDisplay);
  if (publicIdElement) observer.observe(publicIdElement, { childList: true, characterData: true, subtree: true });
  if (statusElement) observer.observe(statusElement, { childList: true, characterData: true, subtree: true });
  if (accessTargetElement) observer.observe(accessTargetElement, { childList: true, characterData: true, subtree: true });
  refreshDisplay();
})();
