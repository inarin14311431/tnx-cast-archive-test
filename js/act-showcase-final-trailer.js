import { loadPublicShowcase, normalizeShowcaseSlug } from "./public-showcase-service.js?v=20260912a";

if (document.body?.id === "act-showcase-page") {
  const slug = normalizeShowcaseSlug(new URLSearchParams(location.search).get("id"));
  if (slug) void initializeFinalTrailer(slug);
}

async function initializeFinalTrailer(slug) {
  try {
    const data = await loadPublicShowcase(slug);
    const model = normalizeTrailer(data);
    if (!model.trailer || document.querySelector("#poster-final-act-trailer")) return;

    const section = createTrailerSection(model);
    mountInsideFinalBoard(section);
  } catch (error) {
    console.warn("ACT TRAILER could not be rendered in the final board.", error);
  }
}

function normalizeTrailer(data) {
  const trailerSource = data?.trailer && typeof data.trailer === "object" && !Array.isArray(data.trailer)
    ? data.trailer
    : null;
  const trailer = trailerSource
    ? text(trailerSource.body || trailerSource.text)
    : text(data?.trailer || data?.actTrailer || data?.trailerText || data?.trailerBody || data?.intro);
  const trailerTitle = trailerSource
    ? text(trailerSource.title)
    : text(data?.trailerTitle);

  return {
    trailerTitle: trailerTitle || "ACT TRAILER",
    trailer
  };
}

function createTrailerSection(model) {
  const section = node("section", "poster-v2-board-trailer");
  section.id = "poster-final-act-trailer";
  section.setAttribute("aria-labelledby", "poster-final-act-trailer-title");
  section.append(
    node("p", "poster-v2-board-trailer__eyebrow", "ACT TRAILER"),
    node("h3", "poster-v2-board-trailer__title", model.trailerTitle),
    node("p", "poster-v2-board-trailer__copy", model.trailer)
  );
  section.querySelector("h3").id = "poster-final-act-trailer-title";
  return section;
}

function mountInsideFinalBoard(section) {
  const mount = () => {
    const board = document.getElementById("poster-showcase-board-v2");
    if (!board) return false;

    const grid = board.querySelector(".poster-v2-board__grid");
    if (!grid) return false;

    const gridBlock = grid.parentElement === board
      ? grid
      : [...board.children].find(child => child === grid || child.contains(grid));
    if (!gridBlock) return false;

    board.insertBefore(section, gridBlock);
    return true;
  };
  if (mount()) return;

  const observer = new MutationObserver(() => {
    if (!mount()) return;
    observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function node(tag, className = "", value = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value) element.textContent = value;
  return element;
}

function text(value) {
  return String(value ?? "").trim();
}
