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
