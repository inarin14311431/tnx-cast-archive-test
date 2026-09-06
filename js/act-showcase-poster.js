const POSTER_PLACEHOLDER_HANDOUTS = new Set([
  "ハンドアウト詳細は未登録です。",
  "公開用ハンドアウトは登録されていません。"
]);

initializePosterShowcase();

function initializePosterShowcase() {
  const root = document.querySelector("#act-showcase-root");
  if (!root) return;

  const apply = () => {
    if (root.hidden) return false;
    if (root.dataset.posterReady === "1") return true;
    root.dataset.posterReady = "1";
    buildPosterShowcase(root);
    return true;
  };

  if (apply()) return;

  const observer = new MutationObserver(() => {
    if (!apply()) return;
    observer.disconnect();
  });
  observer.observe(root, { attributes: true, childList: true, subtree: true });
}

function buildPosterShowcase(root) {
  const story = document.querySelector("#showcase-story");
  const opening = document.querySelector("#scene-opening");
  const castScene = document.querySelector("#scene-cast");
  const handoutScene = document.querySelector("#scene-handout");
  const dataScene = document.querySelector("#scene-data");
  if (!story || !opening || !castScene || !dataScene) return;

  document.body.classList.add("showcase-poster-ready");
  decorateOpening(opening);

  const castCards = [...document.querySelectorAll("#showcase-casts .cast-card")];
  if (!castCards.length) return;

  const board = element("section", "poster-showcase-board");
  board.id = "poster-showcase-board";
  board.setAttribute("aria-label", "アクト紹介ショーケース");

  const frame = element("div", "poster-showcase-frame");
  const grid = element("div", "poster-showcase-grid");

  const leadCard = castCards[0];
  const visualPanel = createVisualPanel(leadCard);
  const profilePanel = createProfilePanel(leadCard);
  const handoutPanel = createHandoutPanel(handoutScene);
  const creditsPanel = createCreditsPanel(castCards);

  grid.append(visualPanel, profilePanel);
  if (handoutPanel) grid.append(handoutPanel);
  grid.append(creditsPanel);
  grid.dataset.columns = handoutPanel ? "4" : "3";

  frame.append(grid);
  if (castCards.length > 1) frame.append(createRoster(castCards.slice(1)));
  board.append(frame);
  story.insertBefore(board, opening.nextElementSibling);

  for (const scene of [...document.querySelectorAll("[data-scene]")]) {
    if (scene !== opening) scene.hidden = true;
  }
  const progress = document.querySelector(".scene-progress");
  if (progress) progress.hidden = true;

  const scrollCue = opening.querySelector(".opening-scroll");
  if (scrollCue) {
    const label = scrollCue.querySelector("span");
    if (label) label.textContent = "SCROLL TO SHOWCASE";
    scrollCue.addEventListener("click", () => board.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  initializePosterReveal(board);
}

function decorateOpening(opening) {
  const content = opening.querySelector(".opening-content");
  if (!content || opening.querySelector(".poster-opening-topbar")) return;

  const topbar = element("div", "poster-opening-topbar");
  const brand = element("div", "poster-brand");
  brand.append(
    elementWithText("strong", "poster-brand__logo", "N◎VA"),
    elementWithText("span", "poster-brand__sub", "TRPG\nACT SHOWCASE")
  );

  const nav = element("div", "poster-nav");
  for (const label of ["ACT SHOWCASE", "WORLD", "CHARACTERS", "ARCHIVE", "EXTRA"]) {
    const item = elementWithText("span", "poster-nav__item", label);
    if (label === "ACT SHOWCASE") item.classList.add("is-active");
    nav.append(item);
  }

  const note = element("div", "poster-topnote");
  note.append(
    elementWithText("span", "", "PUBLIC ACT ARCHIVE"),
    elementWithText("small", "", "NOVA MUNICIPAL DATABASE")
  );
  topbar.append(brand, nav, note);
  opening.prepend(topbar);

  const side = elementWithText("div", "poster-side-copy", "この都市で、まだ見ぬ物語を。");
  opening.append(side);

  const aside = element("div", "poster-opening-aside");
  aside.append(
    elementWithText("strong", "", "CITY LIVES."),
    elementWithText("span", "", "STORIES REMAIN."),
    elementWithText("small", "", "PUBLIC ARCHIVE")
  );
  opening.append(aside);
}

function createVisualPanel(card) {
  const panel = createPanel("CAST VISUAL", card.querySelector(".cast-card__slot")?.textContent || "01");
  panel.classList.add("poster-panel--visual");

  const image = card.querySelector(".cast-card__image");
  if (image) panel.querySelector(".poster-panel__body").append(image);

  const caption = element("div", "poster-visual-caption");
  const tagline = card.querySelector(".cast-card__tagline")?.textContent.trim();
  const name = card.querySelector(".cast-card__name")?.textContent.trim();
  caption.append(
    elementWithText("span", "", tagline || "PUBLIC CAST ARCHIVE"),
    elementWithText("strong", "", name || "CAST")
  );
  panel.querySelector(".poster-panel__body").append(caption);
  return panel;
}

function createProfilePanel(card) {
  const panel = createPanel("CAST PROFILE", "DOSSIER");
  panel.classList.add("poster-panel--profile");
  const body = card.querySelector(".cast-card__body");
  if (body) panel.querySelector(".poster-panel__body").append(body);
  return panel;
}

function createHandoutPanel(handoutScene) {
  if (!handoutScene || handoutScene.hidden) return null;
  const cards = [...handoutScene.querySelectorAll(".handout-file")];
  const meaningful = cards.find(card => {
    if (card.classList.contains("handout-file--empty")) return false;
    const copy = card.querySelector(".handout-file__copy, .handout-file__empty-copy")?.textContent.trim() || "";
    return Boolean(copy) && !POSTER_PLACEHOLDER_HANDOUTS.has(copy);
  });
  if (!meaningful) return null;

  const panel = createPanel("HANDOUT", "PUBLIC FILE");
  panel.classList.add("poster-panel--handout");
  panel.querySelector(".poster-panel__body").append(meaningful);
  return panel;
}

function createCreditsPanel(castCards) {
  const panel = createPanel("CREDITS", "PUBLIC DATA");
  panel.classList.add("poster-panel--credits");
  const body = panel.querySelector(".poster-panel__body");

  const ruler = document.querySelector("#data-ruler")?.textContent.trim() || "—";
  const actName = document.querySelector("#data-act-name")?.textContent.trim() || document.querySelector("#opening-act-name")?.textContent.trim() || "—";
  const names = castCards.map(card => card.querySelector(".cast-card__name")?.textContent.trim()).filter(Boolean);
  const styles = [...document.querySelectorAll("#showcase-casts .style")]
    .map(node => node.childNodes[node.childNodes.length - 1]?.textContent?.trim() || node.textContent.trim())
    .filter(Boolean);
  const uniqueStyles = [...new Set(styles)];

  const table = element("div", "poster-credit-table");
  table.append(
    creditRow("RULER", ruler),
    creditRow("CAST", names.join(" / ") || "—"),
    creditRow("KEY STYLE", uniqueStyles.slice(0, 3).join(" × ") || "—")
  );

  const kicker = elementWithText("p", "poster-credit-kicker", "データの向こうに、人がいる。");
  const note = elementWithText("p", "poster-credit-note", `${actName}\nPUBLIC ACT SHOWCASE / NOVA MUNICIPAL DATABASE`);
  body.append(table, kicker, note);
  return panel;
}

function createRoster(cards) {
  const roster = element("div", "poster-roster");
  roster.append(elementWithText("div", "poster-roster__title", "ADDITIONAL CAST FILES"));
  const list = element("div", "poster-roster__list");
  cards.forEach((card, index) => {
    const item = element("article", "poster-roster__item");
    const name = card.querySelector(".cast-card__name")?.textContent.trim() || `CAST ${index + 2}`;
    const styles = [...card.querySelectorAll(".style")].map(node => node.textContent.trim()).filter(Boolean).join(" / ");
    item.append(
      elementWithText("span", "", String(index + 2).padStart(2, "0")),
      elementWithText("strong", "", name),
      elementWithText("small", "", styles || "PUBLIC CAST")
    );
    list.append(item);
  });
  roster.append(list);
  return roster;
}

function createPanel(title, meta) {
  const panel = element("article", "poster-panel");
  const head = element("header", "poster-panel__head");
  head.append(
    elementWithText("strong", "", title),
    elementWithText("span", "", meta)
  );
  panel.append(head, element("div", "poster-panel__body"));
  return panel;
}

function creditRow(label, value) {
  const row = element("div", "poster-credit-row");
  row.append(
    elementWithText("span", "", label),
    elementWithText("strong", "", value)
  );
  return row;
}

function initializePosterReveal(board) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    board.classList.add("is-visible");
    return;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.disconnect();
      break;
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  observer.observe(board);
}

function element(tag, className = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function elementWithText(tag, className, value) {
  const node = element(tag, className);
  node.textContent = value || "";
  return node;
}
