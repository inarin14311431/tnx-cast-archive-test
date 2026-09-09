(() => {
  const params = new URLSearchParams(location.search);
  const cinematic = String(params.get("showcaseMode") || "").toLowerCase() === "cinematic"
    || String(params.get("bgSample") || "").toLowerCase() === "neotokyo";
  if (!cinematic) return;

  const intro = document.querySelector("#cinematic-intro");
  const openingSubtitle = document.querySelector("#opening-subtitle");
  let sawSequenceActive = intro?.getAttribute("aria-hidden") === "false";
  let boardScrollScheduled = false;
  let trailerFrame = 0;

  const enhance = root => {
    const scope = root instanceof Element ? root : document.documentElement;
    removeFakeNavigation(scope);
    normalizeNodeLabel(scope);
    enhanceTitleScreen(scope);
    simplifyTrailer(scope);
    attachTrailerFollow(scope);
    normalizeOpeningSubtitle();
  };

  enhance(document.documentElement);

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "attributes" && record.target === intro) handleIntroVisibility();
      if (record.type === "characterData") scheduleTrailerFrame(record.target.parentElement);
      for (const node of record.addedNodes || []) {
        if (node.nodeType === Node.ELEMENT_NODE) enhance(node);
      }
      if (record.target instanceof Element) {
        if (record.target.matches?.(".neotokyo-sequence__act-title")) resetSingleLineTitleStyles(record.target);
        scheduleTrailerFrame(record.target);
      }
    }
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-hidden", "class", "style"]
  });

  handleIntroVisibility();

  function removeFakeNavigation(scope) {
    if (scope.matches?.(".poster-v2-nav")) scope.remove();
    scope.querySelectorAll?.(".poster-v2-nav").forEach(node => node.remove());
  }

  function normalizeNodeLabel(scope) {
    const nodes = scope.matches?.(".neotokyo-sequence__system span")
      ? [scope]
      : [...(scope.querySelectorAll?.(".neotokyo-sequence__system span") || [])];
    for (const node of nodes) {
      if (/NEOTOKYO/i.test(node.textContent || "")) node.textContent = "NODE // TOKYO N◎VA";
    }
  }

  function enhanceTitleScreen(scope) {
    const screens = scope.matches?.(".neotokyo-sequence__screen--title")
      ? [scope]
      : [...(scope.querySelectorAll?.(".neotokyo-sequence__screen--title") || [])];
    for (const screen of screens) {
      const title = screen.querySelector(".neotokyo-sequence__act-title");
      if (!title) continue;
      resetSingleLineTitleStyles(title);
      if (screen.querySelector(".neotokyo-sequence__act-subtitle")) continue;
      const text = getMeaningfulSubtitle();
      if (!text) continue;
      const subtitle = document.createElement("p");
      subtitle.className = "neotokyo-sequence__act-subtitle";
      subtitle.textContent = text;
      title.insertAdjacentElement("afterend", subtitle);
    }
  }

  function resetSingleLineTitleStyles(title) {
    for (const property of ["font-size", "white-space", "width", "max-width", "transform", "line-height", "margin-inline"]) {
      if (title.style.getPropertyValue(property)) title.style.removeProperty(property);
    }
    if (title.style.getPropertyValue("--cinematic-fit-scale")) title.style.removeProperty("--cinematic-fit-scale");
  }

  function simplifyTrailer(scope) {
    if (scope.matches?.(".neotokyo-sequence__trailer-definition,.cinematic-trailer-band")) scope.remove();
    scope.querySelectorAll?.(".neotokyo-sequence__trailer-definition,.cinematic-trailer-band").forEach(node => node.remove());
  }

  function attachTrailerFollow(scope) {
    const readouts = scope.matches?.(".neotokyo-sequence__screen--trailer .neotokyo-sequence__readout")
      ? [scope]
      : [...(scope.querySelectorAll?.(".neotokyo-sequence__screen--trailer .neotokyo-sequence__readout") || [])];
    readouts.forEach(readout => {
      if (readout.dataset.followTyping === "true") return;
      readout.dataset.followTyping = "true";
      const resize = new ResizeObserver(() => scheduleTrailerFrame(readout));
      resize.observe(readout);
      scheduleTrailerFrame(readout);
    });
  }

  function scheduleTrailerFrame(target) {
    const readout = target?.closest?.(".neotokyo-sequence__screen--trailer .neotokyo-sequence__readout")
      || (target?.matches?.(".neotokyo-sequence__screen--trailer .neotokyo-sequence__readout") ? target : null);
    if (!readout) return;
    cancelAnimationFrame(trailerFrame);
    trailerFrame = requestAnimationFrame(() => updateTrailerFrame(readout));
  }

  function updateTrailerFrame(readout) {
    if (!readout?.isConnected) return;
    const terminal = readout.closest(".neotokyo-sequence__trailer-terminal") || readout.parentElement;
    const screen = readout.closest(".neotokyo-sequence__screen--trailer");
    if (!terminal || !screen) return;

    const bar = terminal.querySelector(".neotokyo-sequence__terminal-bar");
    const terminalStyles = getComputedStyle(terminal);
    const verticalPadding = parseFloat(terminalStyles.paddingTop || "0") + parseFloat(terminalStyles.paddingBottom || "0");
    const targetHeight = Math.max(94, Math.ceil(readout.scrollHeight + (bar?.offsetHeight || 0) + verticalPadding + 30));
    terminal.style.setProperty("--showcase-trailer-live-height", `${targetHeight}px`);

    if (readout.scrollHeight > readout.clientHeight + 2) {
      readout.scrollTop = readout.scrollHeight;
    }

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const screenRect = screen.getBoundingClientRect();
    const terminalBottom = terminal.getBoundingClientRect().bottom;
    const viewportLimit = Math.min(window.innerHeight - 116, screenRect.bottom - 42);
    if (terminalBottom <= viewportLimit) return;

    const delta = Math.min(180, Math.max(42, terminalBottom - viewportLimit + 52));
    if (screen.scrollHeight > screen.clientHeight + 4) {
      screen.scrollTo({ top: screen.scrollHeight, behavior: reduced ? "auto" : "smooth" });
    } else {
      window.scrollBy({ top: delta, behavior: reduced ? "auto" : "smooth" });
    }
  }

  function normalizeOpeningSubtitle() {
    if (!openingSubtitle) return;
    const text = String(openingSubtitle.textContent || "").trim();
    openingSubtitle.hidden = !text || text.toUpperCase() === "CAST SHOWCASE";
  }

  function getMeaningfulSubtitle() {
    const text = String(openingSubtitle?.textContent || "").trim();
    if (!text || text.toUpperCase() === "CAST SHOWCASE") return "";
    return text;
  }

  function getFinalCastTarget() {
    return document.querySelector("#poster-showcase-board-v2 .poster-v2-panel--visual")
      || document.querySelector("#poster-showcase-board-v2 .poster-v2-grid")
      || document.querySelector("#poster-showcase-board-v2")
      || document.querySelector("#showcase-board");
  }

  function handleIntroVisibility() {
    if (!intro) return;
    const active = intro.getAttribute("aria-hidden") === "false";
    if (active) {
      sawSequenceActive = true;
      return;
    }
    if (!sawSequenceActive || boardScrollScheduled) return;
    boardScrollScheduled = true;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      const target = getFinalCastTarget();
      if (!target || document.body.classList.contains("showcase-neotokyo-intro-active")) {
        boardScrollScheduled = false;
        return;
      }
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }, reduced ? 0 : 900);
  }
})();
