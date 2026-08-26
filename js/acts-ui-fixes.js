(() => {
  const list = document.querySelector("#act-history-list");
  if (!list) return;

  function fact(className, label, value) {
    const node = document.createElement("p");
    node.className = `act-record__fact ${className}`;
    const small = document.createElement("small");
    small.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value || "—";
    node.append(small, strong);
    return node;
  }

  function parseMeta(metaText) {
    const text = String(metaText || "").trim();
    const castMatch = text.match(/CAST\s*([0-9]+)/i);
    const date = text.replace(/\s*\/\s*CAST\s*[0-9]+\s*$/i, "").trim() || "日時未登録";
    return {
      date,
      cast: castMatch ? `CAST ${String(castMatch[1]).padStart(2, "0")}` : "—"
    };
  }

  function syncFacts(record) {
    const meta = record.querySelector(".act-record__meta");
    const ruler = record.querySelector(":scope > .act-record__ruler");
    const role = record.querySelector("[data-participation-role] strong")?.textContent?.trim() || "—";
    const parsed = parseMeta(meta?.textContent);
    const rulerValue = String(ruler?.textContent || "").replace(/^\s*RULER\s*[:：]\s*/i, "").trim() || "—";

    let facts = record.querySelector(":scope > .act-record__facts");
    if (!facts) {
      facts = document.createElement("div");
      facts.className = "act-record__facts";
      const exp = record.querySelector(":scope > .act-record__exp");
      record.insertBefore(facts, exp || null);
    }

    const values = [
      ["act-record__fact--date", "参加日時 DATE", parsed.date],
      ["act-record__fact--cast", "ハンドアウト CAST No.", parsed.cast],
      ["act-record__fact--style", "スタイル ASSIGN STYLE", role],
      ["act-record__fact--ruler", "ルーラー RULER", rulerValue]
    ];

    values.forEach(([className, label, value]) => {
      let node = facts.querySelector(`.${className}`);
      if (!node) {
        node = fact(className, label, value);
        facts.append(node);
      } else {
        const small = node.querySelector("small");
        const strong = node.querySelector("strong");
        if (small && small.textContent !== label) small.textContent = label;
        if (strong && strong.textContent !== value) strong.textContent = value;
      }
    });
  }

  function normalizeRecord(record) {
    const ruler = record.querySelector(":scope > .act-record__ruler");
    if (ruler) {
      const normalized = String(ruler.textContent || "").replace(/^\s*RULER\s*[:：]\s*/i, "").trim() || "—";
      if (ruler.textContent !== normalized) ruler.textContent = normalized;
    }

    const title = record.querySelector(".act-record__title");
    const showcaseLink = title?.querySelector("a[href]");
    record.classList.toggle("has-showcase-link", Boolean(showcaseLink));
    if (showcaseLink) {
      showcaseLink.classList.add("act-record__showcase-link");
      showcaseLink.setAttribute("aria-label", `${showcaseLink.textContent.trim()} のアクト紹介を開く`);
      showcaseLink.title = "公開アクト紹介を開く";
    }

    syncFacts(record);
  }

  function normalizeAll(root = list) {
    if (root instanceof Element && root.matches(".act-record")) normalizeRecord(root);
    root.querySelectorAll?.(".act-record").forEach(normalizeRecord);
  }

  normalizeAll();
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      normalizeAll();
    });
  }).observe(list, { childList: true, subtree: true, characterData: true });
})();
