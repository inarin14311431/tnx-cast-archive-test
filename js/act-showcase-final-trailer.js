import { loadPublicShowcase, normalizeShowcaseSlug } from "./public-showcase-service.js?v=20260912a";

if (document.body?.id === "act-showcase-page") {
  const slug = normalizeShowcaseSlug(new URLSearchParams(location.search).get("id"));
  if (slug) void initializeFinalTrailer(slug);
}

async function initializeFinalTrailer(slug) {
  try {
    const data = await loadPublicShowcase(slug);
    const trailer = normalizeTrailer(data);
    if (!trailer || document.querySelector("#poster-final-act-trailer")) return;

    mountInsideFinalBoard(createTrailerSection(trailer));
  } catch (error) {
    console.warn("ACT TRAILER could not be rendered in the final board.", error);
  }
}

function normalizeTrailer(data) {
  const source = data?.trailer && typeof data.trailer === "object" && !Array.isArray(data.trailer)
    ? data.trailer
    : null;
  return source
    ? text(source.body || source.text)
    : text(data?.intro || data?.trailer || data?.actTrailer || data?.trailerText || data?.trailerBody);
}

function createTrailerSection(trailer) {
  const section = node("section", "poster-v2-board-trailer");
  section.id = "poster-final-act-trailer";
  section.setAttribute("aria-label", "ACT TRAILER");
  section.append(node("p", "poster-v2-board-trailer__copy", trailer));
  return section;
}

function mountInsideFinalBoard(section) {
  const mount = () => {
    const board = document.getElementById("poster-showcase-board-v2");
    const frame = board?.querySelector(":scope > .poster-v2-frame");
    const meta = frame?.querySelector(":scope > .poster-v2-act-meta");
    const grid = frame?.querySelector(":scope > .poster-v2-grid");
    if (!frame || !meta || !grid) return false;

    frame.insertBefore(section, grid);
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
