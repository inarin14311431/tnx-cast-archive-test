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
  let revealFallbackTimer = 0;

  const enhance = root => {
    const scope = root instanceof Element ? root : document.documentElement;
    removeFakeNavigation(scope);
    normalizeNodeLabel(scope);
    enhanceTitleScreen(scope);
    simplifyTrailer(scope);
    attachTrailerFollow(scope);
    polishAssignedPresentation(scope);
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

  window.addEventListener("resize", () => {
    document.querySelectorAll(".neotokyo-sequence__cast--linked .neotokyo-sequence__cast-tagline")
      .forEach(tagline => fitAssignedTagline(tagline));
  }, { passive: true });

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

    if (screen.scrollHeight > screen.clientHeight + 2) {
      screen.scrollTop = screen.scrollHeight;
      return;
    }

    const terminalBottom = terminal.getBoundingClientRect().bottom;
    const viewportLimit = window.innerHeight - 116;
    if (terminalBottom > viewportLimit) {
      window.scrollBy({ top: Math.min(180, terminalBottom - viewportLimit + 42), behavior: "auto" });
    }
  }

  function polishAssignedPresentation(scope) {
    const cards = [];
    if (scope.matches?.(".neotokyo-sequence__cast--linked")) cards.push(scope);
    const nearest = scope.closest?.(".neotokyo-sequence__cast--linked");
    if (nearest && !cards.includes(nearest)) cards.push(nearest);
    scope.querySelectorAll?.(".neotokyo-sequence__cast--linked").forEach(card => {
      if (!cards.includes(card)) cards.push(card);
    });

    for (const card of cards) {
      const role = card.querySelector(".neotokyo-sequence__role-slot strong");
      if (role && role.dataset.presentationClean !== "true") {
        role.textContent = String(role.textContent || "").replace(/[◎●]/g, "").trim();
        role.dataset.presentationClean = "true";
      }
      const tagline = card.querySelector(".neotokyo-sequence__cast-tagline");
      if (tagline) fitAssignedTagline(tagline);
    }
  }

  function fitAssignedTagline(tagline) {
    if (!tagline?.isConnected) return;
    requestAnimationFrame(() => {
      if (!tagline.isConnected || tagline.clientWidth <= 0) return;
      tagline.style.removeProperty("font-size");
      let size = parseFloat(getComputedStyle(tagline).fontSize) || 16;
      const minimum = 13;
      while (tagline.scrollWidth > tagline.clientWidth + 1 && size > minimum) {
        size = Math.max(minimum, size - .5);
        tagline.style.fontSize = `${size}px`;
      }
    });
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

  function markCastRevealPending() {
    document.body.classList.add("showcase-cast-entry-pending");
    document.body.classList.remove("showcase-cast-entry-reveal");
  }

  function revealCastTarget(target, reduced) {
    clearTimeout(revealFallbackTimer);
    document.body.classList.remove("showcase-cast-entry-pending");
    if (reduced) return;
    document.body.classList.add("showcase-cast-entry-reveal");
    window.setTimeout(() => document.body.classList.remove("showcase-cast-entry-reveal"), 1100);
    target?.querySelector?.("img")?.decode?.().catch?.(() => {});
  }

  function scrollToFinalCast(target, reduced) {
    if (!target) return;
    if (reduced) {
      target.scrollIntoView({ behavior: "auto", block: "start" });
      revealCastTarget(target, true);
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener("scrollend", finish);
      revealCastTarget(target, false);
    };
    window.addEventListener("scrollend", finish, { once: true });
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    revealFallbackTimer = window.setTimeout(finish, 900);
  }

  function handleIntroVisibility() {
    if (!intro) return;
    const active = intro.getAttribute("aria-hidden") === "false";
    if (active) {
      sawSequenceActive = true;
      markCastRevealPending();
      return;
    }
    if (!sawSequenceActive || boardScrollScheduled) return;
    boardScrollScheduled = true;
    markCastRevealPending();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      const target = getFinalCastTarget();
      if (!target || document.body.classList.contains("showcase-neotokyo-intro-active")) {
        boardScrollScheduled = false;
        return;
      }
      scrollToFinalCast(target, reduced);
    }, reduced ? 0 : 1000);
  }
})();
