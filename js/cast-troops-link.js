import { supabase } from "./supabase-client.js";

const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
if (publicId) void initialize();

async function initialize() {
  const characterResult = await supabase.from("characters").select("id").eq("public_id", publicId).maybeSingle();
  if (characterResult.error || !characterResult.data) return;
  const troopResult = await supabase.from("troops").select("public_id, name, visibility, level, member_current, member_max").eq("character_id", characterResult.data.id).order("name");
  if (troopResult.error || !troopResult.data?.length) return;
  const troops = troopResult.data;
  const primary = document.querySelector(".cast-header__primary-actions");
  if (primary && !primary.querySelector("[data-cast-troops-jump]")) {
    const link = document.createElement("a");
    link.href = "#cast-troops-panel";
    link.className = "cast-edit-link cast-troops-jump";
    link.dataset.castTroopsJump = "1";
    link.innerHTML = `<span>トループ ${troops.length}</span><small>TROOPS</small>`;
    primary.append(link);
  }
  const panel = document.createElement("section");
  panel.id = "cast-troops-panel";
  panel.className = "cast-troops-panel";
  panel.innerHTML = `<header><h2>配下トループ <small>ASSIGNED TROOPS</small></h2><p>公開トループ、または自分が所有するトループを表示しています。</p></header><div>${troops.map(t => `<a href="./troop.html?id=${encodeURIComponent(t.public_id)}"><span>${escapeHtml(t.name || "名称未設定")}</span><small>Lv.${t.level} / ${t.member_current} of ${t.member_max} / ${t.visibility === "public" ? "PUBLIC" : "PRIVATE"}</small></a>`).join("")}</div>`;
  const mobile = document.querySelector("#mobile-cast-view");
  (mobile || document.querySelector("#cast-content"))?.before(panel);
}

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
