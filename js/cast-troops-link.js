import { supabase } from "./supabase-client.js";

const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
if (publicId) void initialize();

async function initialize() {
  const characterResult = await supabase.from("characters").select("id, experience_points").eq("public_id", publicId).maybeSingle();
  if (characterResult.error || !characterResult.data) return;
  const troopResult = await supabase.from("troops").select("public_id, name, visibility, level, member_max, style_1, experience_spent").eq("character_id", characterResult.data.id).order("name");
  if (troopResult.error || !troopResult.data?.length) return;
  const troops = troopResult.data;
  const troopExperience = troops.reduce((sum, troop) => sum + Math.max(0, Number(troop.experience_spent) || 0), 0);
  const castExperience = Number(characterResult.data.experience_points) || 0;
  const expText = `${castExperience}＋${troopExperience}`;
  decorateExperience(expText);

  const primary = document.querySelector(".cast-header__primary-actions");
  if (primary && !primary.querySelector("[data-cast-troops-jump]")) {
    const link = document.createElement("a");
    link.href = "#cast-troops-panel";
    link.className = "cast-edit-link cast-troops-jump";
    link.dataset.castTroopsJump = "1";
    link.innerHTML = `<span>トループ ${troops.length}</span><small>TROOPS</small>`;
    primary.append(link);
  }

  if (!document.querySelector("#cast-troops-panel")) {
    const panel = document.createElement("section");
    panel.id = "cast-troops-panel";
    panel.className = "cast-troops-panel";
    panel.innerHTML = `<header><h2>配下トループ <small>ASSIGNED TROOPS</small></h2><p>公開トループ、または自分が所有するトループを表示しています。</p></header><div>${troops.map(t => `<a href="./troop.html?id=${encodeURIComponent(t.public_id)}"><span>${escapeHtml(t.name || "名称未設定")}</span><small>${escapeHtml(t.style_1 || "STYLE未設定")} / Lv.${t.level} / 最大${t.member_max}人 / EXP ${t.experience_spent ?? 0} / ${t.visibility === "public" ? "PUBLIC" : "PRIVATE"}</small></a>`).join("")}</div>`;
    const mobile = document.querySelector("#mobile-cast-view");
    (mobile || document.querySelector("#cast-content"))?.before(panel);
  }

  watchUntilExperienceRendered(document.querySelector("#mobile-cast-view"), expText, ".mobile-cast-meta");
  watchUntilExperienceRendered(document.querySelector("#quick-sheet-pages"), expText, ".quick-sheet__identity-meta");
}

function watchUntilExperienceRendered(root, expText, targetSelector) {
  if (!root) return;
  if (decorateExperience(expText, targetSelector)) return;
  const observer = new MutationObserver(() => {
    if (decorateExperience(expText, targetSelector)) observer.disconnect();
  });
  observer.observe(root, { childList: true, subtree: true });
}

function setTextIfChanged(node, value) {
  if (!node || node.textContent === value) return false;
  node.textContent = value;
  return true;
}

function decorateExperience(expText, scope = "") {
  let found = false;
  const desktop = document.querySelector("#cast-exp");
  if (desktop) {
    found = true;
    setTextIfChanged(desktop, `${expText} EXP`);
  }

  if (!scope || scope === ".mobile-cast-meta") {
    document.querySelectorAll(".mobile-cast-meta div").forEach(item => {
      if (item.querySelector("dt")?.textContent?.trim() !== "EXP") return;
      const dd = item.querySelector("dd");
      if (!dd) return;
      found = true;
      setTextIfChanged(dd, expText);
    });
  }

  if (!scope || scope === ".quick-sheet__identity-meta") {
    document.querySelectorAll("#quick-sheet-pages .quick-sheet__identity-meta div").forEach(item => {
      if (item.querySelector("dt")?.textContent?.trim() !== "EXP") return;
      const dd = item.querySelector("dd");
      if (!dd) return;
      found = true;
      setTextIfChanged(dd, expText);
    });
  }
  return found;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
