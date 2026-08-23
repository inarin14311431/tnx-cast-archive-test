const createLink = document.querySelector('a[href="./sheet-mobile-new.html"],a[href$="/sheet-mobile-new.html"]');
const createLabel = createLink?.querySelector("span");
if (createLabel) createLabel.textContent = "Mobile版 新規作成";

const accountActions = document.querySelector(".account-actions");
if (accountActions && !accountActions.querySelector('[data-troop-management-link]')) {
  const link = document.createElement("a");
  link.href = "./troops.html";
  link.dataset.troopManagementLink = "1";
  link.innerHTML = "<span>トループ管理</span><small>TROOP CONTROL</small>";
  const actsLink = accountActions.querySelector('a[href="./acts.html"]');
  if (actsLink) actsLink.after(link); else accountActions.append(link);
}

function installCastTroopLinks(root = document) {
  root.querySelectorAll?.(".owned-cast").forEach(card => {
    if (card.querySelector("[data-cast-troops-link]")) return;
    const castLink = card.querySelector('.owned-cast__links a[href*="cast.html?id="]');
    const management = card.querySelector(".owned-cast__management");
    if (!castLink || !management) return;
    const href = new URL(castLink.href, location.href);
    const publicId = href.searchParams.get("id");
    if (!publicId) return;
    const link = document.createElement("a");
    link.href = `./troops.html?character=${encodeURIComponent(publicId)}`;
    link.className = "owned-cast__troops";
    link.dataset.castTroopsLink = "1";
    link.innerHTML = '<span class="action-label__jp">トループ</span><small class="action-label__en">TROOPS</small>';
    const acts = management.querySelector(".owned-cast__acts");
    if (acts) acts.after(link); else management.prepend(link);
  });
}

installCastTroopLinks();
new MutationObserver(records => {
  if (records.some(record => record.addedNodes.length)) installCastTroopLinks();
}).observe(document.body, { childList: true, subtree: true });
