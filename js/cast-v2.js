import { getCharacter, getCombos, getOutfits, getSkills } from "./cast-data-store.js?v=2";
import { getImageObjectPosition, getImageScale, getImageTransformOrigin } from "./image-focus.js?v=4";
import {
  createCastV2Hero,
  createCastV2Outfits,
  createCastV2Overview,
  createCastV2Runtime,
  createCastV2Skills
} from "./cast-v2-template.js?v=1";

const root = document.querySelector("#cast-v2-root");
const status = document.querySelector("#cast-v2-status");
const errorPanel = document.querySelector("#cast-v2-error");
const errorMessage = document.querySelector("#cast-v2-error-message");

initialize();

async function initialize() {
  try {
    const [character, skills, outfits, combos] = await Promise.all([
      getCharacter(),
      getSkills(),
      getOutfits(),
      getCombos()
    ]);

    if (!character) throw new Error("指定されたキャストは存在しません。");

    document.title = `${character.character_name || "CAST"} // VIEW V2 SAMPLE`;
    document.querySelector("#cast-v2-public-id").textContent = character.public_id || "NO ID";
    syncCurrentViewLink();
    document.querySelector("#cast-v2-hero").innerHTML = createCastV2Hero(character);
    document.querySelector("#cast-v2-overview").innerHTML = createCastV2Overview(character);
    document.querySelector("#cast-v2-skills").innerHTML = createCastV2Skills(skills);
    document.querySelector("#cast-v2-outfits").innerHTML = createCastV2Outfits(outfits);
    document.querySelector("#cast-v2-runtime").innerHTML = createCastV2Runtime(combos);
    configurePortrait(character);
    setupTabs();

    status.hidden = true;
    root.hidden = false;
    window.dispatchEvent(new CustomEvent("tnx:cast-v2-rendered"));
  } catch (error) {
    console.error("Cast V2 sample failed", error);
    status.hidden = true;
    errorMessage.textContent = error?.message || "キャスト情報の取得に失敗しました。";
    errorPanel.hidden = false;
  }
}

function configurePortrait(character) {
  const image = document.querySelector("#cast-v2-image");
  if (!image) return;
  image.style.setProperty("--v2-image-position", getImageObjectPosition(character.image_url));
  image.style.setProperty("--v2-image-scale", String(getImageScale(character.image_url)));
  image.style.setProperty("--v2-image-origin", getImageTransformOrigin(character.image_url));
  image.addEventListener("error", () => {
    image.src = "./assets/placeholders/scan-failed.webp";
  }, { once: true });
}

function syncCurrentViewLink() {
  const link = document.querySelector("#cast-v2-current-link");
  const target = new URL("./cast.html", window.location.href);
  target.search = window.location.search;
  link.href = target.href;
}

function setupTabs() {
  const buttons = [...document.querySelectorAll("[data-v2-tab]")];
  const panels = [...document.querySelectorAll("[data-v2-panel]")];
  const requested = window.location.hash.replace(/^#/, "");

  function activate(name, updateHistory = true) {
    const validName = panels.some(panel => panel.dataset.v2Panel === name) ? name : "overview";
    buttons.forEach(button => {
      const active = button.dataset.v2Tab === validName;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    panels.forEach(panel => {
      const active = panel.dataset.v2Panel === validName;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
    if (updateHistory) history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${validName}`);
  }

  buttons.forEach(button => button.addEventListener("click", () => activate(button.dataset.v2Tab)));
  activate(requested, false);
}
