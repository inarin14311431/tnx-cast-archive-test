const LIFE_PATH_FIELDS = ["life_path_origin", "life_path_experience", "life_path_encounter"];

function splitLegacyLifePath(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(.*?)(?:[：:]\s*)?[＜<]\s*([^＜<>＞]+?)\s*[＞>]+\s*$/);
  if (!match) return null;
  const name = match[1].replace(/[：:]\s*$/, "").trim();
  const skill = match[2].trim();
  return name && skill ? { name, skill } : null;
}

function normalizeLoadedLifePaths() {
  for (const field of LIFE_PATH_FIELDS) {
    const input = document.querySelector(`[data-mobile-character-field="${field}"]`);
    if (!input) continue;
    const detail = splitLegacyLifePath(input.value);
    if (!detail) continue;
    input.value = `${detail.name}（${detail.skill}）`;
    input.dataset.mobileLifePathNormalized = "1";
  }
}

document.addEventListener("tnx:mobile-profile-loaded", normalizeLoadedLifePaths);
queueMicrotask(normalizeLoadedLifePaths);
