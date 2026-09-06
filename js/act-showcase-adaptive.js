const PLACEHOLDER_HANDOUT_TEXTS = new Set([
  "ハンドアウト詳細は未登録です。",
  "公開用ハンドアウトは登録されていません。"
]);

initializeAdaptiveShowcase();

function initializeAdaptiveShowcase() {
  const root = document.querySelector("#act-showcase-root");
  if (!root) return;

  const apply = () => {
    if (root.hidden) return false;
    adaptSceneFlow();
    adaptCastLayout();
    adaptCredits();
    document.body.classList.add("showcase-adaptive-ready");
    initializeScrollMotion();
    return true;
  };

  if (apply()) return;

  const observer = new MutationObserver(() => {
    if (!apply()) return;
    observer.disconnect();
  });
  observer.observe(root, { attributes: true, childList: true, subtree: true });
}

function adaptSceneFlow() {
  const hasTrailer = hasMeaningfulTrailer();
  const hasHandout = hasMeaningfulHandout();

  toggleScene("trailer", hasTrailer);
  toggleScene("handout", hasHandout);

  const visibleScenes = [...document.querySelectorAll("[data-scene]")]
    .filter(scene => !scene.hidden);

  document.body.dataset.showcaseSceneCount = String(visibleScenes.length);
  renumberProgress(visibleScenes);
}

function hasMeaningfulTrailer() {
  const body = document.querySelector("#trailer-body");
  if (!body || body.hidden) return false;
  return Boolean(body.textContent.trim());
}

function hasMeaningfulHandout() {
  const cards = [...document.querySelectorAll("#showcase-handouts .handout-file")];
  if (!cards.length) return false;

  return cards.some(card => {
    if (card.classList.contains("handout-file--empty")) return false;
    const copy = card.querySelector(".handout-file__copy, .handout-file__empty-copy");
    const value = copy?.textContent.trim() || "";
    return Boolean(value) && !PLACEHOLDER_HANDOUT_TEXTS.has(value);
  });
}

function toggleScene(key, visible) {
  const scene = document.querySelector(`[data-scene="${key}"]`);
  const button = document.querySelector(`[data-scene-target="${key}"]`);
  if (scene) scene.hidden = !visible;
  if (button) button.hidden = !visible;
}

function renumberProgress(visibleScenes) {
  visibleScenes.forEach((scene, index) => {
    const key = scene.dataset.scene;
    const number = String(index + 1).padStart(2, "0");
    const buttonNumber = document.querySelector(`[data-scene-target="${key}"] span`);
    const sceneIndex = scene.querySelector(".scene-index");
    if (buttonNumber) buttonNumber.textContent = number;
    if (sceneIndex) {
      const label = sceneIndex.textContent.split("//")[1]?.trim() || key.toUpperCase();
      sceneIndex.textContent = `${number} // ${label}`;
    }
  });
}

function adaptCastLayout() {
  const cards = [...document.querySelectorAll("#showcase-casts .cast-card")];
  const count = cards.length;
  if (!count) return;

  document.body.dataset.showcaseCastCount = String(count);
  const castScene = document.querySelector("#scene-cast");
  if (castScene) castScene.dataset.castCount = String(count);

  if (count === 1) {
    const card = cards[0];
    card.classList.add("cast-card--lead");
    const slot = card.querySelector(".cast-card__slot");
    if (slot) slot.textContent = "LEAD CAST";

    const handout = card.querySelector(".cast-card__handout-flag");
    if (handout && !hasMeaningfulHandout()) handout.hidden = true;
  }
}

function adaptCredits() {
  const metrics = document.querySelector(".data-metrics");
  if (!metrics || metrics.dataset.adaptiveDone === "1") return;
  metrics.dataset.adaptiveDone = "1";

  const castCount = document.querySelectorAll("#showcase-casts .cast-card").length;
  const styleLabels = [...document.querySelectorAll("#showcase-casts .style")]
    .map(node => node.childNodes[node.childNodes.length - 1]?.textContent?.trim() || node.textContent.trim())
    .filter(Boolean);
  const uniqueStyles = [...new Set(styleLabels)];
  const ruler = document.querySelector("#data-ruler")?.textContent.trim();

  const credits = [
    { label: "CAST", value: String(castCount).padStart(2, "0"), note: castCount === 1 ? "LEAD CAST" : "PUBLIC CAST" },
    { label: "RULER", value: ruler && ruler !== "—" ? ruler : "—", note: ruler && ruler !== "—" ? "ACT RULER" : "NOT PUBLISHED" },
    { label: "KEY STYLE", value: uniqueStyles[0] || "—", note: uniqueStyles.length > 1 ? `+${uniqueStyles.length - 1} STYLES` : "PRIMARY STYLE" }
  ];

  metrics.replaceChildren(...credits.map(item => {
    const article = document.createElement("article");
    article.className = "credit-card";
    const label = document.createElement("span");
    label.textContent = item.label;
    const value = document.createElement("strong");
    value.textContent = item.value;
    const note = document.createElement("small");
    note.textContent = item.note;
    article.append(label, value, note);
    return article;
  }));

  const heading = document.querySelector("#data-heading");
  if (heading) heading.textContent = "CREDITS";
  const eyebrow = document.querySelector("#scene-data .scene-eyebrow");
  if (eyebrow) eyebrow.textContent = "PUBLIC ACT CREDIT FILE";
}

function initializeScrollMotion() {
  if (document.body.dataset.scrollMotionReady === "1") return;
  document.body.dataset.scrollMotionReady = "1";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) {
    document.body.classList.add("showcase-scroll-motion-reduced");
    return;
  }

  document.body.classList.add("showcase-scroll-motion");
  const root = document.querySelector("#act-showcase-root");
  let frame = 0;
  let scenes = getVisibleScenes();

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(update);
  };

  const refresh = () => {
    scenes = getVisibleScenes();
    schedule();
  };

  const update = () => {
    frame = 0;
    const viewportHeight = Math.max(window.innerHeight, 1);
    const maxScroll = Math.max(document.documentElement.scrollHeight - viewportHeight, 1);
    const pageProgress = clamp(window.scrollY / maxScroll, 0, 1);
    root?.style.setProperty("--showcase-page-progress", `${(pageProgress * 100).toFixed(2)}%`);
    root?.style.setProperty("--showcase-ambient-shift", `${((pageProgress - 0.5) * -48).toFixed(2)}px`);

    for (const scene of scenes) {
      const rect = scene.getBoundingClientRect();
      const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1);
      applySceneMotion(scene, progress);
    }
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", refresh, { passive: true });

  if ("ResizeObserver" in window && root) {
    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(root);
  }

  requestAnimationFrame(() => {
    refresh();
    requestAnimationFrame(schedule);
  });
}

function getVisibleScenes() {
  return [...document.querySelectorAll("[data-scene]")].filter(scene => !scene.hidden);
}

function applySceneMotion(scene, progress) {
  const enter = smoothstep(0.04, 0.34, progress);
  const leave = smoothstep(0.74, 0.98, progress);
  const focus = enter * (1 - leave);
  const rise = (1 - enter) * 68 - leave * 34;
  const scale = 0.965 + enter * 0.035 - leave * 0.018;

  scene.style.setProperty("--scene-progress", progress.toFixed(4));
  scene.style.setProperty("--scene-opacity", (0.08 + focus * 0.92).toFixed(4));
  scene.style.setProperty("--scene-rise", `${rise.toFixed(2)}px`);
  scene.style.setProperty("--scene-scale", scale.toFixed(4));
  scene.style.setProperty("--scene-parallax", `${((progress - 0.5) * -72).toFixed(2)}px`);
  scene.style.setProperty("--scene-line-progress", `${(progress * 100).toFixed(2)}%`);
  scene.classList.toggle("is-scroll-active", progress > 0.18 && progress < 0.84);

  switch (scene.dataset.scene) {
    case "opening":
      applyOpeningMotion(scene, progress);
      break;
    case "cast":
      applyCastMotion(scene, progress);
      break;
    case "data":
      applyCreditMotion(scene, progress);
      break;
    case "end":
      applyEndMotion(scene, progress);
      break;
  }
}

function applyOpeningMotion(scene, progress) {
  const leave = smoothstep(0.54, 0.94, progress);
  scene.style.setProperty("--opening-world-shift", `${(-leave * 54).toFixed(2)}px`);
  scene.style.setProperty("--opening-title-scale", (1 + leave * 0.055).toFixed(4));
  scene.style.setProperty("--opening-cue-opacity", (1 - smoothstep(0.48, 0.68, progress)).toFixed(4));
}

function applyCastMotion(scene, progress) {
  const imageIn = smoothstep(0.08, 0.40, progress);
  const copyIn = smoothstep(0.18, 0.50, progress);
  const leave = smoothstep(0.78, 0.98, progress);
  scene.style.setProperty("--cast-image-x", `${((-1 + imageIn) * 58 - leave * 18).toFixed(2)}px`);
  scene.style.setProperty("--cast-copy-x", `${((1 - copyIn) * 68 + leave * 18).toFixed(2)}px`);
  scene.style.setProperty("--cast-image-opacity", (0.18 + imageIn * (1 - leave) * 0.82).toFixed(4));
  scene.style.setProperty("--cast-copy-opacity", (0.08 + copyIn * (1 - leave) * 0.92).toFixed(4));
  scene.style.setProperty("--cast-image-scale", (1.035 - imageIn * 0.035 + leave * 0.018).toFixed(4));
}

function applyCreditMotion(scene, progress) {
  const cards = [...scene.querySelectorAll(".credit-card")];
  cards.forEach((card, index) => {
    const start = 0.08 + index * 0.08;
    const finish = 0.42 + index * 0.08;
    const enter = smoothstep(start, finish, progress);
    const leave = smoothstep(0.84 + index * 0.015, 0.99, progress);
    card.style.setProperty("--credit-y", `${((1 - enter) * 54 - leave * 18).toFixed(2)}px`);
    card.style.setProperty("--credit-opacity", (enter * (1 - leave)).toFixed(4));
    card.style.setProperty("--credit-scale", (0.955 + enter * 0.045 - leave * 0.012).toFixed(4));
  });
}

function applyEndMotion(scene, progress) {
  const enter = smoothstep(0.06, 0.54, progress);
  scene.style.setProperty("--end-seal-scale", (0.72 + enter * 0.28).toFixed(4));
  scene.style.setProperty("--end-seal-rotate", `${((1 - enter) * -16).toFixed(2)}deg`);
  scene.style.setProperty("--end-copy-spacing", `${((1 - enter) * 0.08).toFixed(3)}em`);
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
