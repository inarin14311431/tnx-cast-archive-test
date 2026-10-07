(() => {
  const intro = document.querySelector("#cinematic-intro");
  if (!intro) return;

  // The handout -> assignment screen scrolls inside itself on a phone. While there is more below the fold the
  // screen carries data-scroll-cue="1" (CSS draws a soft fade and a down arrow at its bottom edge); the mark goes
  // away as soon as the end is reached, and never appears where the screen does not scroll (desktop).
  const SCREEN = ".neotokyo-sequence__screen--linked.is-splitting";
  const ROOM = 6;
  const tracked = new WeakSet();
  let frame = 0;

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
      const scrolls = /^(auto|scroll)$/.test(getComputedStyle(screen).overflowY);
      const more = screen.scrollHeight - screen.clientHeight - screen.scrollTop > ROOM;
      const next = scrolls && more;
      if (screen.hasAttribute("data-scroll-cue") !== next) {
        if (next) screen.setAttribute("data-scroll-cue", "1");
        else screen.removeAttribute("data-scroll-cue");
      }
    }
  };

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
