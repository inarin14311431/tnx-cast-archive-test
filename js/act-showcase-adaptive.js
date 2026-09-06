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
    adaptEditorialLabels();
    adaptCastLayout();
    adaptCredits();
    document.body.classList.add("showcase-adaptive-ready", "showcase-editorial-ready");
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

function adaptEditorialLabels() {
  const kicker = document.querySelector("#showcase-kicker");
  if (kicker) kicker.textContent = "PUBLIC ACT SHOWCASE";

  const endTitle = document.querySelector("#end-title");
  if (endTitle) endTitle.textContent = "ACT FILE COMPLETE";

  const endEyebrow = document.querySelector("#scene-end .scene-eyebrow");
  if (endEyebrow) endEyebrow.textContent = "PUBLIC SHOWCASE END";

  const endCopy = document.querySelector("#scene-end .end-content > strong");
  if (endCopy) endCopy.textContent = "THE ACT BEGINS NOW";

  const creditButton = document.querySelector('[data-scene-target="data"] strong');
  if (creditButton) creditButton.textContent = "CREDITS";
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

  const castHeading = document.querySelector("#cast-heading");
  const castEyebrow = document.querySelector("#scene-cast .scene-eyebrow");
  const castButton = document.querySelector('[data-scene-target="cast"] strong');

  if (count === 1) {
    const card = cards[0];
    card.classList.add("cast-card--lead");
    const slot = card.querySelector(".cast-card__slot");
    if (slot) slot.textContent = "LEAD CAST";
    if (castHeading) castHeading.textContent = "CAST PROFILE";
    if (castEyebrow) castEyebrow.textContent = "PUBLIC CAST DOSSIER";
    if (castButton) castButton.textContent = "PROFILE";

    const handout = card.querySelector(".cast-card__handout-flag");
    if (handout && !hasMeaningfulHandout()) handout.hidden = true;
  } else {
    if (castHeading) castHeading.textContent = "CAST FILES";
    if (castEyebrow) castEyebrow.textContent = "PUBLIC CAST DOSSIER";
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
    { label: "CAST FILE", value: String(castCount).padStart(2, "0"), note: castCount === 1 ? "LEAD CAST" : "PUBLIC CAST" },
    { label: "ACT RULER", value: ruler && ruler !== "—" ? ruler : "—", note: ruler && ruler !== "—" ? "CREDIT" : "NOT PUBLISHED" },
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
  if (heading) heading.textContent = "ACT CREDITS";
  const eyebrow = document.querySelector("#scene-data .scene-eyebrow");
  if (eyebrow) eyebrow.textContent = "PUBLIC ARCHIVE CREDIT";
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
    root?.style.setProperty("--showcase-ambient-shift", `${((pageProgress - 0.5) * -22).toFixed(2)}px`);

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
  const enter = smoothstep(0.06, 0.30, progress);
  const leave = smoothstep(0.80, 0.99, progress);
  const focus = enter * (1 - leave);
  const rise = (1 - enter) * 24 - leave * 12;
  const scale = 0.992 + enter * 0.008 - leave * 0.004;

  scene.style.setProperty("--scene-progress", progress.toFixed(4));
  scene.style.setProperty("--scene-opacity", (0.30 + focus * 0.70).toFixed(4));
  scene.style.setProperty("--scene-rise", `${rise.toFixed(2)}px`);
  scene.style.setProperty("--scene-scale", scale.toFixed(4));
  scene.classList.toggle("is-scroll-active", progress > 0.18 && progress < 0.86);

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
  const leave = smoothstep(0.56, 0.94, progress);
  scene.style.setProperty("--opening-world-shift", `${(-leave * 22).toFixed(2)}px`);
  scene.style.setProperty("--opening-title-scale", (1 + leave * 0.014).toFixed(4));
  scene.style.setProperty("--opening-cue-opacity", (1 - smoothstep(0.46, 0.66, progress)).toFixed(4));
}

function applyCastMotion(scene, progress) {
  const imageIn = smoothstep(0.08, 0.38, progress);
  const copyIn = smoothstep(0.16, 0.46, progress);
  const leave = smoothstep(0.84, 0.99, progress);
  scene.style.setProperty("--cast-image-x", `${((-1 + imageIn) * 24 - leave * 8).toFixed(2)}px`);
  scene.style.setProperty("--cast-copy-x", `${((1 - copyIn) * 28 + leave * 8).toFixed(2)}px`);
  scene.style.setProperty("--cast-image-opacity", (0.42 + imageIn * (1 - leave) * 0.58).toFixed(4));
  scene.style.setProperty("--cast-copy-opacity", (0.30 + copyIn * (1 - leave) * 0.70).toFixed(4));
  scene.style.setProperty("--cast-image-scale", (1.014 - imageIn * 0.014 + leave * 0.006).toFixed(4));
}

function applyCreditMotion(scene, progress) {
  const cards = [...scene.querySelectorAll(".credit-card")];
  cards.forEach((card, index) => {
    const start = 0.08 + index * 0.07;
    const finish = 0.34 + index * 0.07;
    const enter = smoothstep(start, finish, progress);
    const leave = smoothstep(0.88 + index * 0.01, 0.995, progress);
    card.style.setProperty("--credit-y", `${((1 - enter) * 18 - leave * 7).toFixed(2)}px`);
    card.style.setProperty("--credit-opacity", (0.28 + enter * (1 - leave) * 0.72).toFixed(4));
    card.style.setProperty("--credit-scale", (0.985 + enter * 0.015 - leave * 0.004).toFixed(4));
  });
}

function applyEndMotion(scene, progress) {
  const enter = smoothstep(0.08, 0.48, progress);
  scene.style.setProperty("--end-seal-scale", (0.90 + enter * 0.10).toFixed(4));
  scene.style.setProperty("--end-seal-rotate", `${((1 - enter) * -5).toFixed(2)}deg`);
  scene.style.setProperty("--end-copy-spacing", `${(0.18 + (1 - enter) * 0.025).toFixed(3)}em`);
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
