initializePosterMotionLayer();

function initializePosterMotionLayer() {
  const root = document.querySelector("#act-showcase-root");
  if (!root) return;

  const apply = () => {
    const board = document.querySelector("#poster-showcase-board");
    const opening = document.querySelector("#scene-opening");
    if (root.hidden || !board || !opening) return false;
    if (document.body.dataset.posterMotionReady === "1") return true;

    document.body.dataset.posterMotionReady = "1";
    document.body.classList.remove("showcase-scroll-motion");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.body.classList.add("showcase-poster-motion-reduced");
      board.classList.add("is-visible");
      return true;
    }

    document.body.classList.add("showcase-poster-motion");
    initializeMotion(opening, board);
    return true;
  };

  if (apply()) return;

  const observer = new MutationObserver(() => {
    if (!apply()) return;
    observer.disconnect();
  });
  observer.observe(root, { attributes: true, childList: true, subtree: true });
}

function initializeMotion(opening, board) {
  const frame = board.querySelector(".poster-showcase-frame");
  const panels = [...board.querySelectorAll(".poster-panel")];
  const roster = board.querySelector(".poster-roster");
  let raf = 0;

  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(update);
  };

  const update = () => {
    raf = 0;
    const viewport = Math.max(window.innerHeight, 1);
    const pageMax = Math.max(document.documentElement.scrollHeight - viewport, 1);
    const pageProgress = clamp(window.scrollY / pageMax, 0, 1);
    document.documentElement.style.setProperty("--poster-page-progress", pageProgress.toFixed(4));

    const openingRect = opening.getBoundingClientRect();
    const openingProgress = clamp((-openingRect.top) / Math.max(openingRect.height * 0.82, 1), 0, 1);
    applyOpeningMotion(opening, openingProgress);

    const boardRect = board.getBoundingClientRect();
    const boardProgress = clamp((viewport * 0.88 - boardRect.top) / Math.max(boardRect.height - viewport * 0.12, viewport * 0.9), 0, 1);
    applyBoardMotion(board, frame, panels, roster, boardProgress);
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(board);
    resizeObserver.observe(opening);
  }

  requestAnimationFrame(() => requestAnimationFrame(schedule));
}

function applyOpeningMotion(opening, progress) {
  const contentIn = 1 - smoothstep(0.40, 0.92, progress);
  const chromeIn = 1 - smoothstep(0.56, 0.98, progress);
  const backgroundShift = progress * 42;
  const backgroundScale = 1 + progress * 0.035;

  opening.style.setProperty("--poster-opening-content-opacity", contentIn.toFixed(4));
  opening.style.setProperty("--poster-opening-content-y", `${(-progress * 26).toFixed(2)}px`);
  opening.style.setProperty("--poster-opening-chrome-opacity", chromeIn.toFixed(4));
  opening.style.setProperty("--poster-opening-bg-shift", `${backgroundShift.toFixed(2)}px`);
  opening.style.setProperty("--poster-opening-bg-scale", backgroundScale.toFixed(4));
  opening.style.setProperty("--poster-opening-scroll-opacity", (1 - smoothstep(0.18, 0.54, progress)).toFixed(4));
}

function applyBoardMotion(board, frame, panels, roster, progress) {
  const enter = smoothstep(0.02, 0.24, progress);
  const settle = smoothstep(0.16, 0.48, progress);

  board.style.setProperty("--poster-board-bg-opacity", (0.22 + settle * 0.62).toFixed(4));

  if (frame) {
    frame.style.setProperty("--poster-frame-opacity", (0.18 + enter * 0.82).toFixed(4));
    frame.style.setProperty("--poster-frame-y", `${((1 - enter) * 54 - settle * 6).toFixed(2)}px`);
    frame.style.setProperty("--poster-frame-scale", (0.975 + enter * 0.025).toFixed(4));
    frame.style.setProperty("--poster-frame-glow-alpha", (0.025 + settle * 0.105).toFixed(4));
  }

  panels.forEach((panel, index) => {
    const start = 0.08 + index * 0.085;
    const end = start + 0.25;
    const panelIn = smoothstep(start, end, progress);
    const drift = (1 - panelIn) * (index % 2 === 0 ? 28 : 38);
    const x = index === 0 ? -drift : index === 1 ? drift : 0;
    const y = index >= 2 ? drift : (1 - panelIn) * 18;

    panel.style.setProperty("--poster-panel-opacity", (0.06 + panelIn * 0.94).toFixed(4));
    panel.style.setProperty("--poster-panel-x", `${x.toFixed(2)}px`);
    panel.style.setProperty("--poster-panel-y", `${y.toFixed(2)}px`);
    panel.style.setProperty("--poster-panel-scale", (0.965 + panelIn * 0.035).toFixed(4));
    panel.style.setProperty("--poster-panel-border-alpha", (0.13 + panelIn * 0.16).toFixed(4));
    panel.style.setProperty("--poster-panel-glow-alpha", (0.015 + panelIn * 0.045).toFixed(4));
    panel.style.setProperty("--poster-image-y", `${((1 - panelIn) * 6).toFixed(2)}px`);
  });

  if (roster) {
    const rosterIn = smoothstep(0.46, 0.72, progress);
    roster.style.setProperty("--poster-roster-opacity", rosterIn.toFixed(4));
    roster.style.setProperty("--poster-roster-y", `${((1 - rosterIn) * 24).toFixed(2)}px`);
  }
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
