import { loadPublicShowcase, normalizeShowcaseSlug } from "./public-showcase-service.js?v=20260912a";

if (document.body?.id === "act-showcase-page") {
  const slug = normalizeShowcaseSlug(new URLSearchParams(location.search).get("id"));
  if (slug) void initializeFinalTrailer(slug);
}

async function initializeFinalTrailer(slug) {
  try {
    const data = await loadPublicShowcase(slug);
    const trailer = normalizeTrailer(data);
    if (!trailer.body || document.querySelector("#poster-final-act-trailer")) return;

    mountAsFinalStage(createTrailerSection(trailer));
  } catch (error) {
    console.warn("Final ACT TRAILER could not be rendered.", error);
  }
}

function normalizeTrailer(data) {
  const source = data?.trailer && typeof data.trailer === "object" && !Array.isArray(data.trailer)
    ? data.trailer
    : null;
  return {
    title: source ? text(source.title) : text(data?.trailerTitle),
    body: source
      ? text(source.body || source.text)
      : text(data?.intro || data?.trailer || data?.actTrailer || data?.trailerText || data?.trailerBody)
  };
}

function createTrailerSection(trailer) {
  const section = node("section", "poster-v2-trailer-stage");
  section.id = "poster-final-act-trailer";
  section.setAttribute("aria-labelledby", "poster-final-act-trailer-heading");

  const inner = node("div", "poster-v2-trailer-stage__inner");
  const overline = node("p", "poster-v2-trailer-stage__overline");
  overline.append(
    node("span", "", "05 / FINAL TRANSMISSION"),
    node("small", "", "N◎VA MUNICIPAL DATABASE // ACT ARCHIVE")
  );

  const heading = node("h2", "poster-v2-trailer-stage__heading", "ACT TRAILER");
  heading.id = "poster-final-act-trailer-heading";
  inner.append(overline, heading);

  if (trailer.title) {
    inner.append(node("p", "poster-v2-trailer-stage__title", trailer.title));
  }

  const copyWrap = node("div", "poster-v2-trailer-stage__copy-wrap");
  copyWrap.append(node("blockquote", "poster-v2-trailer-stage__copy", trailer.body));
  inner.append(copyWrap);

  const footer = node("div", "poster-v2-trailer-stage__footer");
  footer.setAttribute("aria-hidden", "true");
  footer.append(
    node("i", ""),
    node("span", "", "END OF ACT FILE // ACCESS LOG CLOSED"),
    node("i", "")
  );
  inner.append(footer);
  section.append(inner);
  return section;
}

function mountAsFinalStage(section) {
  const mount = () => {
    const story = document.querySelector("#showcase-story");
    const board = document.getElementById("poster-showcase-board-v2");
    if (!story || !board) return false;

    story.append(section);
    const keepLast = new MutationObserver(() => {
      if (section.parentElement === story && story.lastElementChild !== section) story.append(section);
    });
    keepLast.observe(story, { childList: true });
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
