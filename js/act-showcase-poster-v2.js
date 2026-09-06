const POSTER_V2_HANDOUT_PLACEHOLDERS = new Set([
  "ハンドアウト詳細は未登録です。",
  "公開用ハンドアウトは登録されていません。"
]);

initializePosterV2();

function initializePosterV2() {
  const root = document.querySelector("#act-showcase-root");
  if (!root) return;

  const apply = () => {
    if (root.hidden) return false;
    const story = document.querySelector("#showcase-story");
    const opening = document.querySelector("#scene-opening");
    const castCards = [...document.querySelectorAll("#showcase-casts .cast-card")];
    if (!story || !opening || !castCards.length) return false;
    if (root.dataset.posterV2Ready === "1") return true;

    root.dataset.posterV2Ready = "1";
    document.body.classList.add("showcase-poster-v2-ready");
    document.body.classList.remove("showcase-poster-ready", "showcase-poster-motion", "showcase-scroll-motion");

    document.querySelector("#poster-showcase-board")?.remove();
    buildOpening(opening);
    const board = buildBoard(castCards);
    story.insertBefore(board, opening.nextElementSibling);

    for (const scene of [...document.querySelectorAll("[data-scene]")]) {
      if (scene !== opening) scene.hidden = true;
    }
    document.querySelector(".scene-progress")?.setAttribute("hidden", "");

    const cue = opening.querySelector(".opening-scroll");
    if (cue) {
      const label = cue.querySelector("span");
      if (label) label.textContent = "SCROLL TO SHOWCASE";
      cue.addEventListener("click", () => board.scrollIntoView({ behavior: "smooth", block: "start" }));
    }

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

function buildOpening(opening) {
  const topbar = el("div", "poster-v2-topbar");
  const brand = el("div", "poster-v2-brand");
  brand.append(
    textEl("strong", "poster-v2-brand__logo", "N◎VA"),
    textEl("span", "poster-v2-brand__sub", "TRPG\nACT SHOWCASE")
  );

  const nav = el("div", "poster-v2-nav");
  for (const label of ["ACT SHOWCASE", "WORLD", "CHARACTERS", "ARCHIVE", "EXTRA"]) {
    const item = textEl("span", "poster-v2-nav__item", label);
    if (label === "ACT SHOWCASE") item.classList.add("is-active");
    nav.append(item);
  }

  const note = el("div", "poster-v2-topnote");
  note.append(textEl("span", "", "PUBLIC ACT ARCHIVE"), textEl("small", "", "NOVA MUNICIPAL DATABASE"));
  topbar.append(brand, nav, note);

  opening.prepend(topbar);
  opening.append(
    textEl("div", "poster-v2-sidecopy", "この都市で、まだ見ぬ物語を。"),
    Object.assign(el("div", "poster-v2-aside"), { innerHTML: "<strong>CITY LIVES.</strong><span>STORIES REMAIN.</span><small>PUBLIC ARCHIVE</small>" })
  );
}

function buildBoard(castCards) {
  const board = el("section", "poster-v2-board");
  board.id = "poster-showcase-board-v2";
  board.setAttribute("aria-label", "アクト紹介ショーケース");

  const frame = el("div", "poster-v2-frame");
  const lead = castCards[0];
  const sourceImage = lead.querySelector(".cast-card__image img");
  const name = lead.querySelector(".cast-card__name")?.textContent.trim() || "CAST";
  const reading = lead.querySelector(".cast-card__reading")?.textContent.trim() || "";
  const tagline = lead.querySelector(".cast-card__tagline")?.textContent.trim() || "";
  const link = lead.querySelector(".cast-card__link[href]")?.getAttribute("href") || "";

  const visual = createPanel("01 / CAST", "CAST VISUAL", "poster-v2-panel--visual");
  const visualImage = el("div", "poster-v2-visual");
  const clonedImage = document.createElement("img");
  clonedImage.src = sourceImage?.currentSrc || sourceImage?.src || "./assets/placeholders/scan-failed.webp";
  clonedImage.alt = sourceImage?.alt || name;
  clonedImage.loading = "eager";
  clonedImage.decoding = "async";
  clonedImage.style.objectPosition = sourceImage?.style.objectPosition || "50% 50%";
  clonedImage.style.setProperty("--tnx-image-scale", sourceImage?.style.getPropertyValue("--tnx-image-scale") || "1");
  clonedImage.style.setProperty("--tnx-image-origin", sourceImage?.style.getPropertyValue("--tnx-image-origin") || "50% 50%");
  clonedImage.addEventListener("error", () => {
    if (!clonedImage.src.endsWith("scan-failed.webp")) clonedImage.src = "./assets/placeholders/scan-failed.webp";
  });
  visualImage.append(clonedImage);
  const caption = el("div", "poster-v2-visual__caption");
  caption.append(textEl("span", "", tagline || "PUBLIC CAST ARCHIVE"), textEl("strong", "", name));
  visualImage.append(caption);
  visual.querySelector(".poster-v2-panel__body").append(visualImage);

  const profile = createPanel("CAST PROFILE", "PUBLIC DOSSIER", "poster-v2-panel--profile");
  const profileBody = profile.querySelector(".poster-v2-panel__body");
  if (reading) profileBody.append(textEl("p", "poster-v2-reading", reading));
  profileBody.append(textEl("h2", "poster-v2-name", name));
  if (tagline) profileBody.append(textEl("p", "poster-v2-tagline", tagline));

  const styles = [...lead.querySelectorAll(".style")].map(node => node.textContent.trim()).filter(Boolean);
  if (styles.length) {
    const tags = el("div", "poster-v2-tags");
    styles.forEach(value => tags.append(textEl("span", "", value)));
    profileBody.append(tags);
  }

  const meta = el("dl", "poster-v2-meta");
  for (const item of [...lead.querySelectorAll(".cast-card__meta > div")]) {
    meta.append(
      textEl("dt", "", item.querySelector("small")?.textContent.trim() || "DATA"),
      textEl("dd", "", item.querySelector("strong")?.textContent.trim() || "—")
    );
  }
  if (meta.childElementCount) profileBody.append(meta);
  if (link) {
    const anchor = textEl("a", "poster-v2-cta", "VIEW FULL PROFILE →");
    anchor.href = link;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    profileBody.append(anchor);
  }

  const handout = createHandoutPanel();
  const credits = createCreditsPanel(castCards);
  const grid = el("div", `poster-v2-grid ${handout ? "poster-v2-grid--4" : "poster-v2-grid--3"}`);
  grid.append(visual, profile);
  if (handout) grid.append(handout);
  grid.append(credits);
  frame.append(grid);
  if (castCards.length > 1) frame.append(createRoster(castCards.slice(1)));
  board.append(frame);
  return board;
}

function createHandoutPanel() {
  const meaningful = [...document.querySelectorAll("#showcase-handouts .handout-file")].find(card => {
    if (card.classList.contains("handout-file--empty")) return false;
    const copy = card.querySelector(".handout-file__copy, .handout-file__empty-copy")?.textContent.trim() || "";
    return Boolean(copy) && !POSTER_V2_HANDOUT_PLACEHOLDERS.has(copy);
  });
  if (!meaningful) return null;

  const panel = createPanel("02 / HANDOUT", "PLAYER INFORMATION", "poster-v2-panel--handout");
  const body = panel.querySelector(".poster-v2-panel__body");
  body.append(textEl("h3", "poster-v2-section-title", meaningful.querySelector("h3")?.textContent.trim() || "HANDOUT"));
  const copy = meaningful.querySelector(".handout-file__copy")?.textContent.trim() || "";
  if (copy) body.append(textEl("p", "poster-v2-handout-copy", copy));
  return panel;
}

function createCreditsPanel(castCards) {
  const panel = createPanel("03 / CREDITS", "PUBLIC DATA", "poster-v2-panel--credits");
  const body = panel.querySelector(".poster-v2-panel__body");
  const ruler = document.querySelector("#data-ruler")?.textContent.trim() || "—";
  const actName = document.querySelector("#data-act-name")?.textContent.trim() || document.querySelector("#opening-act-name")?.textContent.trim() || "—";
  const names = castCards.map(card => card.querySelector(".cast-card__name")?.textContent.trim()).filter(Boolean);
  const uniqueStyles = [...new Set([...document.querySelectorAll("#showcase-casts .style")].map(node => node.textContent.trim()).filter(Boolean))];
  const table = el("div", "poster-v2-credit-table");
  table.append(creditRow("RULER", ruler), creditRow("CAST", names.join(" / ") || "—"), creditRow("KEY STYLE", uniqueStyles.slice(0, 3).join(" × ") || "—"));
  body.append(table, textEl("p", "poster-v2-credit-kicker", "データの向こうに、人がいる。"), textEl("p", "poster-v2-credit-note", `${actName}\nPUBLIC ACT SHOWCASE / NOVA MUNICIPAL DATABASE`));
  return panel;
}

function createRoster(cards) {
  const roster = el("div", "poster-v2-roster");
  roster.append(textEl("div", "poster-v2-roster__title", "ADDITIONAL CAST FILES"));
  const list = el("div", "poster-v2-roster__list");
  cards.forEach((card, index) => {
    const item = el("article", "poster-v2-roster__item");
    item.append(
      textEl("span", "", String(index + 2).padStart(2, "0")),
      textEl("strong", "", card.querySelector(".cast-card__name")?.textContent.trim() || `CAST ${index + 2}`),
      textEl("small", "", [...card.querySelectorAll(".style")].map(node => node.textContent.trim()).join(" / ") || "PUBLIC CAST")
    );
    list.append(item);
  });
  roster.append(list);
  return roster;
}

function createPanel(slot, title, extraClass) {
  const panel = el("article", `poster-v2-panel ${extraClass}`);
  const head = el("header", "poster-v2-panel__head");
  head.append(textEl("span", "", slot), textEl("strong", "", title));
  panel.append(head, el("div", "poster-v2-panel__body"));
  return panel;
}

function creditRow(label, value) {
  const row = el("div", "poster-v2-credit-row");
  row.append(textEl("span", "", label), textEl("strong", "", value));
  return row;
}

function initializeMotion(opening, board) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.body.classList.add("showcase-poster-v2-reduced");
    return;
  }
  document.body.classList.add("showcase-poster-v2-motion");
  const frame = board.querySelector(".poster-v2-frame");
  const panels = [...board.querySelectorAll(".poster-v2-panel")];
  let raf = 0;
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  const update = () => {
    raf = 0;
    const vh = Math.max(window.innerHeight, 1);
    const max = Math.max(document.documentElement.scrollHeight - vh, 1);
    document.documentElement.style.setProperty("--poster-v2-page-progress", `${(clamp(window.scrollY / max, 0, 1) * 100).toFixed(2)}%`);

    const openingRect = opening.getBoundingClientRect();
    const op = clamp((-openingRect.top) / Math.max(openingRect.height * .78, 1), 0, 1);
    opening.style.setProperty("--poster-v2-open-y", `${(-op * 24).toFixed(2)}px`);
    opening.style.setProperty("--poster-v2-open-opacity", (1 - smoothstep(.46, .94, op)).toFixed(4));
    opening.style.setProperty("--poster-v2-bg-y", `${(op * 34).toFixed(2)}px`);
    opening.style.setProperty("--poster-v2-bg-scale", (1 + op * .03).toFixed(4));

    const rect = board.getBoundingClientRect();
    const p = clamp((vh * .9 - rect.top) / Math.max(board.offsetHeight - vh * .12, vh * .86), 0, 1);
    const frameIn = smoothstep(.02, .24, p);
    if (frame) {
      frame.style.setProperty("--poster-v2-frame-opacity", (.18 + frameIn * .82).toFixed(4));
      frame.style.setProperty("--poster-v2-frame-y", `${((1 - frameIn) * 56).toFixed(2)}px`);
      frame.style.setProperty("--poster-v2-frame-scale", (.972 + frameIn * .028).toFixed(4));
    }
    panels.forEach((panel, index) => {
      const start = .08 + index * .09;
      const enter = smoothstep(start, start + .24, p);
      const shift = (1 - enter) * (index < 2 ? 34 : 24);
      panel.style.setProperty("--poster-v2-panel-opacity", (.04 + enter * .96).toFixed(4));
      panel.style.setProperty("--poster-v2-panel-x", `${(index === 0 ? -shift : index === 1 ? shift : 0).toFixed(2)}px`);
      panel.style.setProperty("--poster-v2-panel-y", `${(index >= 2 ? shift : 14 * (1 - enter)).toFixed(2)}px`);
      panel.style.setProperty("--poster-v2-panel-scale", (.965 + enter * .035).toFixed(4));
    });
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  requestAnimationFrame(() => requestAnimationFrame(schedule));
}

function el(tag, className = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
function textEl(tag, className, value) {
  const node = el(tag, className);
  node.textContent = value || "";
  return node;
}
function smoothstep(a, b, value) {
  if (a === b) return value >= b ? 1 : 0;
  const x = clamp((value - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
