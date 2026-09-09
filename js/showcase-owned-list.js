const section = document.querySelector("#owned-showcase-restore");
const select = document.querySelector("#owned-showcase-select");
const loadButton = document.querySelector("#load-owned-showcase");
const deleteButton = document.querySelector("#delete-owned-showcase");
const status = document.querySelector("#owned-showcase-status");

if (section && select && loadButton && deleteButton) {
  enhanceOwnedShowcaseSection();
}

function enhanceOwnedShowcaseSection() {
  const heading = section.querySelector("#owned-showcase-restore-heading");
  const lead = section.querySelector(".private-history-selector__lead");
  const legacyControls = section.querySelector(".selector-controls");

  if (heading) heading.innerHTML = "公開済みアクト紹介 <small>PUBLISHED SHOWCASE MANAGEMENT</small>";
  if (lead) lead.textContent = "自分が公開したアクト紹介を一覧で管理できます。編集では保存済み内容をフォームへ復元し、削除では公開用データだけを削除します。アクト履歴と参加履歴は残ります。";
  if (legacyControls) {
    legacyControls.classList.add("owned-showcase-legacy-controls");
    legacyControls.hidden = true;
  }

  const list = document.createElement("div");
  list.id = "owned-showcase-list";
  list.className = "owned-showcase-list";
  list.setAttribute("aria-live", "polite");
  status?.insertAdjacentElement("beforebegin", list);

  list.addEventListener("click", event => {
    const button = event.target.closest("button[data-showcase-action]");
    if (!button) return;
    const slug = normalizeSlug(button.dataset.slug);
    if (!slug) return;

    select.value = slug;
    select.dispatchEvent(new Event("change", { bubbles: true }));

    if (button.dataset.showcaseAction === "edit") {
      loadButton.click();
      return;
    }
    if (button.dataset.showcaseAction === "delete") {
      deleteButton.click();
    }
  });

  const observer = new MutationObserver(renderOwnedShowcaseList);
  observer.observe(select, { childList: true, subtree: true });
  select.addEventListener("change", renderOwnedShowcaseList);
  renderOwnedShowcaseList();
}

function renderOwnedShowcaseList() {
  const list = document.querySelector("#owned-showcase-list");
  if (!list) return;

  const items = [...select.options]
    .filter(option => normalizeSlug(option.value))
    .map(option => ({
      slug: normalizeSlug(option.value),
      label: parseLabel(option.textContent, option.value)
    }));

  if (!items.length) {
    list.innerHTML = `
      <div class="owned-showcase-empty">
        <strong>公開済みのアクト紹介はありません</strong>
        <small>NO PUBLISHED SHOWCASE</small>
      </div>`;
    return;
  }

  list.innerHTML = items.map(item => `
    <article class="owned-showcase-row" data-showcase-slug="${escapeAttribute(item.slug)}">
      <div class="owned-showcase-row__identity">
        <small>ACT SHOWCASE</small>
        <strong>${escapeHtml(item.label.name)}</strong>
        <code>${escapeHtml(item.slug)}</code>
      </div>
      <div class="owned-showcase-row__state">
        <span>公開データあり</span>
        <small>PUBLISHED</small>
      </div>
      <div class="owned-showcase-row__actions">
        <button type="button" data-showcase-action="edit" data-slug="${escapeAttribute(item.slug)}">編集 <small>EDIT</small></button>
        <button type="button" class="is-danger" data-showcase-action="delete" data-slug="${escapeAttribute(item.slug)}">削除 <small>DELETE</small></button>
      </div>
    </article>`).join("");
}

function parseLabel(value, fallbackSlug) {
  const text = String(value || "").trim();
  const [name] = text.split(/\s+\/\/\s+/);
  return { name: name || fallbackSlug };
}

function normalizeSlug(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
