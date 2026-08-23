import { supabase } from "./supabase-client.js";

const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
if (publicId) void initialize();

async function initialize() {
  installStyles();
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

function installStyles() {
  if (document.querySelector("style[data-cast-troops-style]")) return;
  const style = document.createElement("style");
  style.dataset.castTroopsStyle = "1";
  style.textContent = `.cast-troops-panel{display:grid;gap:10px;width:min(var(--page-width),calc(100% - var(--page-gutter)));margin:12px auto 16px;padding:14px;border:1px solid var(--color-border);border-left:4px solid var(--color-accent);background:var(--color-surface);box-sizing:border-box}.cast-troops-panel>header{display:flex;justify-content:space-between;gap:12px;align-items:end}.cast-troops-panel h2,.cast-troops-panel p{margin:0}.cast-troops-panel h2 small{display:block;color:var(--color-muted);font:700 8px/1.2 var(--font-data)}.cast-troops-panel p{color:var(--color-muted);font-size:11px}.cast-troops-panel>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:7px}.cast-troops-panel a{display:grid;gap:3px;padding:9px 11px;border:1px solid var(--color-border-muted);background:var(--color-accent-soft);color:var(--color-text);text-decoration:none}.cast-troops-panel a span{font-weight:900}.cast-troops-panel a small{color:var(--color-muted);font:700 8px/1.2 var(--font-data)}@media(max-width:640px){.cast-troops-panel{width:calc(100% - 12px);margin:8px auto}.cast-troops-panel>header{align-items:start;flex-direction:column}.cast-troops-panel>div{grid-template-columns:1fr}}`;
  document.head.append(style);
}

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
