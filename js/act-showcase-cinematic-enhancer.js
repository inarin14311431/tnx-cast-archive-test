(() => {
  const params = new URLSearchParams(location.search);
  const showcaseMode = String(params.get("showcaseMode") || "").trim().toLowerCase();
  const legacySample = String(params.get("bgSample") || "").trim().toLowerCase();
  const isCinematic = showcaseMode === "cinematic" || legacySample === "neotokyo";
  if (!isCinematic) return;

  document.documentElement.classList.add("showcase-cinematic-enhancer");
  bridgeLegacyTrailerData();

  const ready = () => {
    const intro = document.querySelector("#cinematic-intro");
    if (!intro) return;
    enhanceTree(intro);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === "characterData") {
          pulseTyping(record.target.parentElement);
          continue;
        }
        for (const added of record.addedNodes) {
          if (added.nodeType === Node.ELEMENT_NODE) enhanceTree(added);
        }
        if (record.type === "childList") pulseTyping(record.target);
      }
    });
    observer.observe(intro, { subtree: true, childList: true, characterData: true });
    window.addEventListener("resize", debounce(() => {
      document.querySelectorAll(".neotokyo-sequence__act-title").forEach(fitSingleLineTitle);
    }, 90), { passive: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();

  function enhanceTree(root) {
    if (!(root instanceof Element)) return;
    const screens = root.matches(".neotokyo-sequence__screen") ? [root] : [...root.querySelectorAll(".neotokyo-sequence__screen")];
    for (const screen of screens) enhanceScreen(screen);
    normalizeVisibleQuotes(root);
  }

  function enhanceScreen(screen) {
    if (screen.dataset.cinematicEnhanced === "true") return;
    screen.dataset.cinematicEnhanced = "true";

    if (screen.classList.contains("neotokyo-sequence__screen--opening")) enhanceAccess(screen);
    if (screen.classList.contains("neotokyo-sequence__screen--title")) enhanceTitle(screen);
    if (screen.classList.contains("neotokyo-sequence__screen--trailer")) enhanceTrailer(screen);
    if (screen.classList.contains("neotokyo-sequence__screen--summary")) {
      screen.querySelectorAll(".neotokyo-sequence__overview-intro-label,.neotokyo-sequence__overview-intro").forEach(node => node.remove());
    }
  }

  function enhanceAccess(screen) {
    screen.classList.add("is-cinematic-access");
    const eyebrow = screen.querySelector(".neotokyo-sequence__eyebrow");
    const title = screen.querySelector(".neotokyo-sequence__opening-title");
    const sub = screen.querySelector(".neotokyo-sequence__opening-sub");
    if (eyebrow) eyebrow.textContent = "01 // N◎VA MUNICIPAL DATABASE";
    if (title) title.textContent = "ACT FILE // ACCESS";
    if (sub) sub.textContent = "ESTABLISHING PUBLIC SESSION";
    if (!screen.querySelector(".neotokyo-sequence__access-seal")) {
      const seal = document.createElement("div");
      seal.className = "neotokyo-sequence__access-seal";
      seal.textContent = "PUBLIC ACCESS // AUTHORIZED";
      screen.append(seal);
      window.setTimeout(() => seal.classList.add("is-authorized"), 620);
    }
  }

  function enhanceTitle(screen) {
    screen.querySelectorAll(".neotokyo-sequence__act-overview").forEach(node => node.remove());
    const title = screen.querySelector(".neotokyo-sequence__act-title");
    if (!title) return;
    requestAnimationFrame(() => {
      fitSingleLineTitle(title);
      requestAnimationFrame(() => title.classList.add("is-cinematic-title"));
    });
  }

  function enhanceTrailer(screen) {
    const copy = screen.querySelector(".neotokyo-sequence__readout");
    if (!copy) return;
    screen.classList.add("is-terminal-readout");
    const label = screen.querySelector(".neotokyo-sequence__eyebrow");
    if (label) label.textContent = "ACT_TRAILER.TXT";
    if (!screen.querySelector(".neotokyo-sequence__terminal-status")) {
      const status = document.createElement("div");
      status.className = "neotokyo-sequence__terminal-status";
      status.textContent = "INPUT MODE // REC";
      copy.before(status);
    }
  }

  function fitSingleLineTitle(title) {
    title.style.whiteSpace = "nowrap";
    title.style.removeProperty("font-size");
    const parent = title.parentElement;
    if (!parent) return;
    const available = Math.max(120, parent.clientWidth - 24);
    let size = Number.parseFloat(getComputedStyle(title).fontSize) || 64;
    while (title.scrollWidth > available && size > 28) {
      size -= 2;
      title.style.fontSize = `${size}px`;
    }
  }

  function pulseTyping(target) {
    const readout = target?.closest?.(".neotokyo-sequence__readout");
    if (!readout) return;
    readout.classList.remove("is-typing-pulse");
    requestAnimationFrame(() => readout.classList.add("is-typing-pulse"));
  }

  function normalizeVisibleQuotes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
      const next = String(node.nodeValue || "")
        .replace(/“\s*[“"「『‘']+/g, "“")
        .replace(/[”"」』’']+\s*”/g, "”")
        .replace(/“{2,}/g, "“")
        .replace(/”{2,}/g, "”");
      if (next !== node.nodeValue) node.nodeValue = next;
    }
  }

  async function bridgeLegacyTrailerData() {
    const slug = String(params.get("id") || "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "").slice(0, 64);
    if (!slug) return;
    try {
      const response = await fetch("https://koprmbkoftuuffslhsvt.supabase.co/rest/v1/rpc/get_public_act_showcase", {
        method: "POST",
        headers: {
          apikey: "sb_publishable_Dsb9Boo4aP3c_v-Iaam4mw_F1szMdUi",
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ p_slug: slug }),
        cache: "no-store"
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) return;
      if (!data.trailer && typeof data.intro === "string" && data.intro.trim()) {
        data.trailer = { title: "ACT TRAILER", body: data.intro.trim() };
      }
    } catch {
      // The canonical page loader remains authoritative when the compatibility read fails.
    }
  }

  function debounce(fn, wait) {
    let timer = 0;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), wait);
    };
  }
})();
