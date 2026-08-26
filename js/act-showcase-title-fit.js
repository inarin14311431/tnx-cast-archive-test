(() => {
  const target = document.querySelector("#showcase-act-name");
  if (!target) return;

  let frame = 0;
  function fit() {
    frame = 0;
    target.style.removeProperty("font-size");
    const available = target.clientWidth;
    if (!available || !target.textContent.trim()) return;

    const computed = getComputedStyle(target);
    let size = Number.parseFloat(computed.fontSize) || 32;
    const minimum = innerWidth <= 800 ? 14 : 18;
    let guard = 0;
    while (target.scrollWidth > available && size > minimum && guard < 80) {
      size -= 0.5;
      target.style.fontSize = `${size}px`;
      guard += 1;
    }
  }

  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fit);
  }

  new MutationObserver(schedule).observe(target, { childList: true, characterData: true, subtree: true });
  addEventListener("resize", schedule, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(schedule);
  schedule();
})();
