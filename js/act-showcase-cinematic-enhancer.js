(() => {
  const params = new URLSearchParams(location.search);
  if (String(params.get("bgSample") || "").trim().toLowerCase() !== "neotokyo") return;

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
    if (!copy || copy.closest(".neotokyo-sequence__trailer-terminal")) return;
    copy.classList.add("is-terminal-readout");
    const terminal = document.createElement("div");
    terminal.className = "neotokyo-sequence__trailer-terminal";
    const bar = document.createElement("div");
    bar.className = "neotokyo-sequence__terminal-bar";
    bar.append(
      createText("strong", "ACT_TRAILER.TXT"),
      createText("small", "N◎VA MUNICIPAL DATABASE / PRE-ACT"),
      createText("span", "INPUT MODE // REC")
    );
    copy.parentNode.insertBefore(terminal, copy);
    terminal.append(bar, copy);
  }

  function fitSingleLineTitle(title) {
    if (!title?.isConnected) return;
    title.style.whiteSpace = "nowrap";
    title.style.fontSize = "";
    const parent = title.parentElement;
    if (!parent) return;
    const available = Math.max(220, parent.clientWidth - (innerWidth <= 760 ? 24 : 80));
    let size = parseFloat(getComputedStyle(title).fontSize) || 48;
    const minimum = innerWidth <= 760 ? 17 : 22;
    title.style.fontSize = `${size}px`;
    for (let count = 0; count < 90 && title.scrollWidth > available && size > minimum; count += 1) {
      size = Math.max(minimum, size - 1.5);
      title.style.fontSize = `${size}px`;
    }
    if (title.scrollWidth > available) {
      const scale = Math.max(.68, available / title.scrollWidth);
      title.style.transformOrigin = "center";
      title.style.setProperty("--cinematic-fit-scale", String(scale));
    } else {
      title.style.setProperty("--cinematic-fit-scale", "1");
    }
  }

  function normalizeVisibleQuotes(root) {
    const selectors = [
      ".neotokyo-sequence__cast-detail h3",
      ".neotokyo-sequence__summary-cast-body h3",
      ".poster-v2-name",
      ".poster-v2-visual__caption strong",
      ".poster-v2-roster__name"
    ];
    const nodes = root.matches?.(selectors.join(",")) ? [root] : [...root.querySelectorAll?.(selectors.join(",")) || []];
    for (const node of nodes) {
      const normalized = normalizeDuplicateHandleQuotes(node.textContent);
      if (normalized !== node.textContent) node.textContent = normalized;
    }
  }

  function normalizeDuplicateHandleQuotes(value) {
    return String(value ?? "")
      .replace(/“\s*[“"「『‘']+/g, "“")
      .replace(/[”"」』’']+\s*”/g, "”")
      .replace(/“{2,}/g, "“")
      .replace(/”{2,}/g, "”")
      .replace(/"{2,}/g, '"');
  }

  function pulseTyping(target) {
    const readout = target?.closest?.(".is-terminal-readout") || (target?.matches?.(".is-terminal-readout") ? target : null);
    const terminal = readout?.closest(".neotokyo-sequence__trailer-terminal");
    if (!terminal) return;
    terminal.classList.remove("is-inputting");
    requestAnimationFrame(() => terminal.classList.add("is-inputting"));
  }

  function bridgeLegacyTrailerData() {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      const requestUrl = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (!String(requestUrl).includes("/rest/v1/rpc/get_public_act_showcase")) return response;
      try {
        const text = await response.clone().text();
        if (!text) return response;
        const data = JSON.parse(text);
        if (!data || typeof data !== "object" || Array.isArray(data)) return response;

        const explicitTrailer = data.trailer || data.actTrailer || data.trailerText || data.trailerBody;
        if (!explicitTrailer && typeof data.intro === "string" && data.intro.trim()) {
          data.trailer = { title: "ACT TRAILER", body: data.intro.trim() };
          data.intro = "";
        }
        if (Array.isArray(data.casts)) {
          data.casts = data.casts.map(cast => ({
            ...cast,
            fullName: normalizeDuplicateHandleQuotes(cast?.fullName || cast?.full_name || ""),
            full_name: normalizeDuplicateHandleQuotes(cast?.full_name || cast?.fullName || ""),
            reading: normalizeDuplicateHandleQuotes(cast?.reading || "")
          }));
        }

        const headers = new Headers(response.headers);
        headers.delete("content-length");
        headers.delete("content-encoding");
        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      } catch (error) {
        console.warn("Legacy act trailer compatibility bridge skipped.", error);
        return response;
      }
    };
  }

  function createText(tag, value) {
    const element = document.createElement(tag);
    element.textContent = value;
    return element;
  }

  function debounce(callback, wait) {
    let timer = 0;
    return (...args) => {
      clearTimeout(timer);
      timer = window.setTimeout(() => callback(...args), wait);
    };
  }
})();
