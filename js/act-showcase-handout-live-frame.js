(() => {
  if (document.body?.id !== "act-showcase-page") return;

  const intro = document.querySelector("#cinematic-intro");
  if (!intro) return;

  const observedReadouts = new WeakSet();
  const lastHeights = new WeakMap();
  let activeReadout = null;
  let scheduled = false;

  const mutationObserver = new MutationObserver(() => scheduleSync());
  mutationObserver.observe(intro, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class"]
  });
  window.addEventListener("resize", scheduleSync, { passive: true });
  scheduleSync();

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      syncHandout();
    });
  }

  function syncHandout() {
    const stage = intro.querySelector(".neotokyo-sequence__stage");
    const screen = intro.querySelector(".neotokyo-sequence__screen--linked");
    const readout = screen?.querySelector(".neotokyo-sequence__handout-panel .neotokyo-sequence__readout");
    const live = Boolean(stage && screen && readout && !screen.classList.contains("is-splitting"));

    if (!live) {
      if (stage?.classList.contains("is-handout-scroll")) stage.classList.remove("is-handout-scroll");
      if (activeReadout) releaseReadout(activeReadout);
      activeReadout = null;
      return;
    }

    if (!stage.classList.contains("is-handout-scroll")) stage.classList.add("is-handout-scroll");
    if (activeReadout !== readout) {
      if (activeReadout) releaseReadout(activeReadout);
      activeReadout = readout;
      stage.scrollTop = 0;
    }
    observeReadout(readout);
    updateReadout(readout);
  }

  function observeReadout(readout) {
    if (observedReadouts.has(readout) || typeof ResizeObserver !== "function") return;
    observedReadouts.add(readout);
    const resizeObserver = new ResizeObserver(() => updateReadout(readout));
    resizeObserver.observe(readout);
  }

  function updateReadout(readout) {
    if (!readout?.isConnected) return;
    const screen = readout.closest(".neotokyo-sequence__screen--linked");
    if (!screen || screen.classList.contains("is-splitting")) return;

    const styles = getComputedStyle(readout);
    const lineHeight = numeric(styles.lineHeight) || numeric(styles.fontSize) * 1.67 || 24;
    const minHeight = Math.ceil(
      lineHeight * 2 + numeric(styles.paddingTop) + numeric(styles.paddingBottom)
    );
    const targetHeight = Math.max(minHeight, Math.ceil(readout.scrollHeight));
    const previousHeight = lastHeights.get(readout);
    if (previousHeight === targetHeight) return;

    lastHeights.set(readout, targetHeight);
    readout.style.minHeight = `${minHeight}px`;
    readout.style.height = `${targetHeight}px`;
    readout.style.maxHeight = "none";
    readout.style.overflow = "visible";
    readout.style.flex = "0 0 auto";
    readout.style.transition = prefersReducedMotion() ? "none" : "height .12s ease-out";
    readout.style.setProperty("--showcase-handout-live-height", `${targetHeight}px`);
  }

  function releaseReadout(readout) {
    lastHeights.delete(readout);
    for (const property of ["min-height", "height", "max-height", "overflow", "flex", "transition", "--showcase-handout-live-height"]) {
      readout.style.removeProperty(property);
    }
  }

  function numeric(value) {
    const parsed = Number.parseFloat(value || "0");
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  }
})();
