(() => {
  const intro = document.querySelector("#cinematic-intro");
  if (!intro) return;

  // The handout -> assignment screen scrolls inside itself on a phone. While there is more below the fold the
  // screen carries data-scroll-cue="1" (CSS draws a soft fade and a down arrow at its bottom edge); the mark goes
  // away as soon as the end is reached, and never appears where the screen does not scroll (desktop).
  const SCREEN = ".neotokyo-sequence__screen--linked.is-splitting";
  const ROOM = 6;
  const REVEAL_MS = 800;
  const tracked = new WeakSet();
  const revealed = new WeakSet();
  const manual = new WeakSet();
  let frame = 0;
  let reveal = null;
  let revealFrame = 0;

  const refresh = () => {
    frame = 0;
    for (const screen of intro.querySelectorAll(SCREEN)) {
      if (!tracked.has(screen)) {
        tracked.add(screen);
        screen.addEventListener("scroll", queue, { passive: true });
        sizeWatcher?.observe(screen);
        const layout = screen.querySelector(".neotokyo-sequence__linked-layout");
        if (layout) sizeWatcher?.observe(layout);
      }
      if (screen.classList.contains("is-assigned") && !revealed.has(screen)) {
        revealed.add(screen);
        requestAnimationFrame(() => requestAnimationFrame(() => startReveal(screen)));
      }
      const scrolls = /^(auto|scroll)$/.test(getComputedStyle(screen).overflowY);
      const more = screen.scrollHeight - screen.clientHeight - screen.scrollTop > ROOM;
      const next = scrolls && more;
      if (screen.hasAttribute("data-scroll-cue") !== next) {
        if (next) screen.setAttribute("data-scroll-cue", "1");
        else screen.removeAttribute("data-scroll-cue");
      }
    }
  };

  const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true
    || document.body.classList.contains("showcase-neotokyo-reduced");
  const finished = () => intro.getAttribute("aria-hidden") === "true";

  // Once the cast card is in place, bring the LINKING divider and the top of the assignment card into view
  // (rAF-interpolated scrollTop, ~800ms). Not on screens that do not scroll, not after the reader has scrolled
  // by hand, not under reduced motion, not once the intro is skipped or finished, and it stops the moment the
  // reader advances.
  function startReveal(screen) {
    cancelReveal();
    if (!screen.isConnected || manual.has(screen) || reduced() || finished()) return;
    if (!/^(auto|scroll)$/.test(getComputedStyle(screen).overflowY)) return;
    const maxTop = screen.scrollHeight - screen.clientHeight;
    if (maxTop <= ROOM) return;
    const anchor = screen.querySelector(".neotokyo-sequence__link-bridge") || screen.querySelector(".neotokyo-sequence__assign-panel");
    if (!anchor) return;
    const shift = anchor.getBoundingClientRect().top - screen.getBoundingClientRect().top - 12;
    const to = Math.max(0, Math.min(maxTop, Math.round(screen.scrollTop + shift)));
    if (to <= screen.scrollTop + 2) return;
    reveal = { screen, from: screen.scrollTop, to, start: performance.now() };
    revealFrame = requestAnimationFrame(stepReveal);
  }

  function stepReveal(now) {
    revealFrame = 0;
    const job = reveal;
    if (!job) return;
    const { screen } = job;
    if (!screen.isConnected || manual.has(screen) || reduced() || finished()) {
      reveal = null;
      return;
    }
    const progress = Math.min(1, (now - job.start) / REVEAL_MS);
    const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
    screen.scrollTop = job.from + (job.to - job.from) * eased;
    if (progress < 1) revealFrame = requestAnimationFrame(stepReveal);
    else reveal = null;
  }

  function cancelReveal() {
    reveal = null;
    if (revealFrame) cancelAnimationFrame(revealFrame);
    revealFrame = 0;
  }

  for (const type of ["touchstart", "wheel", "pointerdown"]) {
    intro.addEventListener(type, event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest(".neotokyo-sequence__advance, .neotokyo-sequence__skip")) return;
      const screen = target.closest(SCREEN);
      if (!screen) return;
      manual.add(screen);
      if (reveal?.screen === screen) cancelReveal();
    }, { capture: true, passive: true });
  }
  // Advancing or skipping must switch screens at once, not wait for a scroll to finish.
  intro.addEventListener("click", event => {
    if (event.target instanceof Element && event.target.closest(".neotokyo-sequence__advance, .neotokyo-sequence__skip")) cancelReveal();
  }, { capture: true });

  function queue() {
    if (!frame) frame = requestAnimationFrame(refresh);
  }

  const sizeWatcher = typeof ResizeObserver === "function" ? new ResizeObserver(queue) : null;
  const hasStructuralElementMutation = records => records.some(record => record.type === "attributes"
    || [...record.addedNodes, ...record.removedNodes].some(item => item.nodeType === Node.ELEMENT_NODE));
  new MutationObserver(records => {
    if (hasStructuralElementMutation(records)) queue();
  }).observe(intro, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  addEventListener("resize", queue, { passive: true });
  queue();
})();
