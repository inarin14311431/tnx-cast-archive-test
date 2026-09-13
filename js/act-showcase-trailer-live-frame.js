(() => {
  if (document.body?.id !== "act-showcase-page") return;

  const intro = document.querySelector("#cinematic-intro");
  if (!intro) return;

  const observedReadouts = new WeakSet();
  let scheduled = false;

  const observer = new MutationObserver(() => scheduleSync());
  observer.observe(intro, { subtree: true, childList: true, characterData: true });
  window.addEventListener("resize", scheduleSync, { passive: true });
  scheduleSync();

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      syncAll();
    });
  }

  function syncAll() {
    const readouts = intro.querySelectorAll(
      ".neotokyo-sequence__screen--trailer .neotokyo-sequence__trailer-terminal .neotokyo-sequence__readout"
    );
    for (const readout of readouts) {
      observeReadout(readout);
      updateFrame(readout);
    }
  }

  function observeReadout(readout) {
    if (observedReadouts.has(readout) || typeof ResizeObserver !== "function") return;
    observedReadouts.add(readout);
    const resizeObserver = new ResizeObserver(() => updateFrame(readout));
    resizeObserver.observe(readout);
  }

  function updateFrame(readout) {
    if (!readout?.isConnected) return;
    const terminal = readout.closest(".neotokyo-sequence__trailer-terminal");
    if (!terminal) return;

    const bar = terminal.querySelector(".neotokyo-sequence__terminal-bar");
    const styles = getComputedStyle(terminal);
    const verticalPadding = numeric(styles.paddingTop) + numeric(styles.paddingBottom);
    const targetHeight = Math.max(
      94,
      Math.ceil(readout.scrollHeight + (bar?.offsetHeight || 0) + verticalPadding + 30)
    );

    terminal.style.minHeight = "94px";
    terminal.style.height = `${targetHeight}px`;
    terminal.style.maxHeight = "none";
    terminal.style.overflow = "visible";
    terminal.style.transition = prefersReducedMotion() ? "none" : "height .12s ease-out";
    terminal.style.setProperty("--showcase-trailer-live-height", `${targetHeight}px`);
  }

  function numeric(value) {
    const parsed = Number.parseFloat(value || "0");
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  }
})();
