(() => {
  const intro = document.querySelector("#cinematic-intro");
  const pageRoot = document.querySelector("#act-showcase-root");
  if (!intro || !pageRoot) return;

  const params = new URLSearchParams(location.search);
  const isNeoTokyo = String(params.get("bgSample") || "").trim().toLowerCase() === "neotokyo";

  const classify = (text, kind) => {
    const length = Array.from(String(text || "").replace(/[\s　]+/g, "")).length;
    if (kind === "title") {
      if (length <= 10) return "short";
      if (length <= 14) return "medium";
      if (length <= 20) return "long";
      return "xlong";
    }
    if (length <= 7) return "short";
    if (length <= 12) return "medium";
    if (length <= 16) return "long";
    return "xlong";
  };

  const fit = (element, kind) => {
    if (!element) return;
    const value = element.textContent.trim();
    element.classList.add(kind === "title" ? "showcase-fit-title" : "showcase-fit-cast-name");
    const size = classify(value, kind);
    element.dataset.fit = size;
    const assigned = element.closest(".neotokyo-sequence__cast--linked");
    if (assigned) assigned.dataset.nameFit = size;
  };

  let typographyFrame = 0;
  const syncTypography = () => {
    typographyFrame = 0;
    fit(document.querySelector("#opening-act-name"), "title");
    for (const element of document.querySelectorAll(".poster-v2-name")) fit(element, "cast");
    for (const element of intro.querySelectorAll(".neotokyo-sequence__act-title")) fit(element, "title");
    for (const element of intro.querySelectorAll(".neotokyo-sequence__cast-detail h3,.neotokyo-sequence__summary-cast-body h3")) fit(element, "cast");
  };

  const queueTypography = () => {
    if (typographyFrame) return;
    typographyFrame = requestAnimationFrame(syncTypography);
  };

  const typographyObserver = new MutationObserver(queueTypography);
  typographyObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  queueTypography();

  if (!isNeoTokyo) return;

  const nativeSetTimeout = window.setTimeout.bind(window);
  let activeTitleCleanup = null;

  window.setTimeout = (callback, delay, ...args) => {
    const titleScreen = intro.querySelector(".neotokyo-sequence__screen--title");
    if (Number(delay) !== 1900 || !titleScreen || titleScreen.dataset.pauseArmed === "1") {
      return nativeSetTimeout(callback, delay, ...args);
    }

    titleScreen.dataset.pauseArmed = "1";
    window.setTimeout = nativeSetTimeout;

    const stage = intro.querySelector(".neotokyo-sequence__stage");
    const advance = intro.querySelector(".neotokyo-sequence__advance");
    const terminal = titleScreen.querySelector(".neotokyo-sequence__terminal");
    const originalAdvanceText = advance?.textContent || "CLICK TO CONTINUE";
    const originalTerminalText = terminal?.textContent || "";
    let settled = false;
    let timer = 0;

    const cleanup = () => {
      if (stage) stage.removeEventListener("click", onStageClick);
      if (advance) {
        advance.removeEventListener("click", onAdvanceClick);
        advance.classList.remove("neotokyo-sequence__advance--title-access");
        advance.textContent = originalAdvanceText;
        advance.hidden = true;
      }
      if (terminal && intro.getAttribute("aria-hidden") !== "true") terminal.textContent = originalTerminalText;
      stage?.classList.remove("is-awaiting-title-access", "is-awaiting-advance");
      document.body.classList.remove("showcase-neotokyo-title-paused");
      if (activeTitleCleanup === cleanup) activeTitleCleanup = null;
    };

    const release = () => {
      if (settled) return;
      settled = true;
      nativeSetTimeout(() => cleanup(), 0);
      callback(...args);
    };

    function onStageClick(event) {
      if (event.target.closest("button")) return;
      release();
    }

    function onAdvanceClick() {
      release();
    }

    stage?.classList.add("is-awaiting-title-access", "is-awaiting-advance");
    document.body.classList.add("showcase-neotokyo-title-paused");
    if (terminal) terminal.textContent = "TITLE LOCKED // INPUT REQUIRED // CLICK TO ACCESS TRAILER";
    if (advance) {
      advance.textContent = "ACCESS TRAILER";
      advance.hidden = false;
      advance.classList.add("neotokyo-sequence__advance--title-access");
      advance.addEventListener("click", onAdvanceClick);
    }
    stage?.addEventListener("click", onStageClick);
    activeTitleCleanup = cleanup;

    timer = nativeSetTimeout(release, 60 * 60 * 1000);
    return timer;
  };

  const decorateSummaryAccess = () => {
    const summary = intro.querySelector(".neotokyo-sequence__screen--summary");
    if (!summary) return;
    const footer = intro.querySelector(".neotokyo-sequence__footer");
    if (!footer || footer.querySelector(".neotokyo-finale__access-button")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "neotokyo-finale__access-button";
    button.setAttribute("aria-label", "アクト紹介本編を開く");

    const code = document.createElement("span");
    code.textContent = "ACCESS // AUTHORIZED";
    const label = document.createElement("strong");
    label.textContent = "ACCESS ACT";
    const note = document.createElement("small");
    note.textContent = "OPEN FULL SHOWCASE";
    button.append(code, label, note);

    button.addEventListener("click", event => {
      event.stopPropagation();
      intro.querySelector(".neotokyo-sequence__advance")?.click();
    });
    footer.append(button);
  };

  const sequenceObserver = new MutationObserver(() => {
    queueTypography();
    decorateSummaryAccess();
    if (intro.getAttribute("aria-hidden") === "true") activeTitleCleanup?.();
  });
  sequenceObserver.observe(intro, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-hidden", "class"]
  });
})();
