import { supabase } from "./supabase-client.js";

const createLink = document.querySelector('a[href="./sheet-mobile-new.html"],a[href$="/sheet-mobile-new.html"]');
const createLabel = createLink?.querySelector("span");
if (createLabel) createLabel.textContent = "Mobile版 新規作成";

const accountActions = document.querySelector(".account-actions");
if (accountActions && !accountActions.querySelector('[data-troop-management-link]')) {
  const markup = '<a href="./troops.html" data-troop-management-link="1"><span>トループ管理</span><small>TROOP CONTROL</small></a>';
  const actsLink = accountActions.querySelector('a[href="./acts.html"]');
  if (actsLink) actsLink.insertAdjacentHTML("afterend", markup);
  else accountActions.insertAdjacentHTML("beforeend", markup);
}

installTroopLinkStyle();
void initializeLinkedTroops();

async function initializeLinkedTroops() {
  const auth = await supabase.auth.getUser();
  const user = auth.data?.user;
  if (!user) return;

  const [characterResult, troopResult] = await Promise.all([
    supabase.from("characters").select("id, public_id").eq("owner_id", user.id),
    supabase.from("troops").select("character_id").eq("owner_id", user.id).not("character_id", "is", null)
  ]);

  if (characterResult.error || troopResult.error) {
    console.warn("Failed to resolve linked troop shortcuts.", characterResult.error || troopResult.error);
    return;
  }

  const idToPublicId = new Map((characterResult.data || []).map(character => [character.id, character.public_id]));
  const linkedPublicIds = new Set((troopResult.data || []).map(troop => idToPublicId.get(troop.character_id)).filter(Boolean));
  const root = document.querySelector("#owned-casts");
  if (!root) return;

  const decorate = () => root.querySelectorAll(".owned-cast").forEach(card => decorateCastCard(card, linkedPublicIds));
  decorate();

  let queued = false;
  new MutationObserver(records => {
    if (!records.some(record => record.addedNodes.length)) return;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      decorate();
    });
  }).observe(root, { childList: true, subtree: true });
}

function decorateCastCard(card, linkedPublicIds) {
  const castLink = card.querySelector('.owned-cast__links a[href*="cast.html?id="]');
  const management = card.querySelector(".owned-cast__management");
  if (!castLink || !management) return;

  const href = new URL(castLink.href, location.href);
  const publicId = href.searchParams.get("id") || "";
  const linked = linkedPublicIds.has(publicId);
  const existing = management.querySelector("[data-cast-troops-link]");

  management.classList.toggle("owned-cast__management--with-troop", linked);
  if (!linked) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const troopLink = document.createElement("a");
  troopLink.href = `./troops.html?character=${encodeURIComponent(publicId)}`;
  troopLink.className = "owned-cast__troops";
  troopLink.dataset.castTroopsLink = "1";
  troopLink.innerHTML = '<span class="action-label__jp">トループ</span><small class="action-label__en">TROOPS</small>';
  const acts = management.querySelector(".owned-cast__acts");
  if (acts) acts.insertAdjacentElement("afterend", troopLink);
  else management.prepend(troopLink);
}

function installTroopLinkStyle() {
  if (document.querySelector("style[data-account-troop-links-v2]")) return;
  const style = document.createElement("style");
  style.dataset.accountTroopLinksV2 = "1";
  style.textContent = `
    body[data-page="account.html"] .owned-cast__management {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2fr);
    }
    body[data-page="account.html"] .owned-cast__management > .owned-cast__acts {
      grid-column: 1;
      grid-row: 1;
    }
    body[data-page="account.html"] .owned-cast__management > .owned-cast__troops {
      grid-column: 2;
      grid-row: 1;
    }
    body[data-page="account.html"] .owned-cast__management:not(.owned-cast__management--with-troop) > .owned-cast__acts {
      grid-column: 1 / 3;
    }
    body[data-page="account.html"] .owned-cast__management > .owned-cast__management-label,
    body[data-page="account.html"] .owned-cast__management > button {
      grid-column: 3;
      grid-row: 1;
    }
    body[data-page="account.html"] .owned-cast__management > .owned-cast__troops {
      min-width: 0;
      min-height: 46px;
      padding: 6px 5px;
      border: 1px solid color-mix(in srgb, var(--color-accent) 48%, var(--color-border-muted));
      color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 7%, var(--color-surface));
      text-align: center;
      text-decoration: none;
    }
    @media (max-width: 767px) {
      body[data-page="account.html"] .owned-cast__management > .owned-cast__troops {
        min-height: 44px;
        padding-inline: 4px;
      }
    }
  `;
  document.head.append(style);
}
