import { SHEET_HELP_ORDER, SHEET_HELP_TOPICS } from "./help-content.js";

const page = document.body?.dataset.page;
if (page === "sheet.html") initializeSheetHelp();

function initializeSheetHelp() {
  ensureHelpStyles();
  const dialog = createDialog();
  document.body.append(dialog);

  installSidebarHelp();
  installSectionHelp("sheet-skills", "editing");
  installSectionHelp("sheet-style-skills", "styleSkills");
  installSectionHelp("sheet-outfits", "outfits");
  installImageHelp();
  installComboHelp();

  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-sheet-help]");
    if (!trigger) return;
    event.preventDefault();
    openHelp(trigger.dataset.sheetHelp || "save");
  });

  dialog.addEventListener("click", event => {
    const topicButton = event.target.closest("[data-help-topic]");
    if (topicButton) {
      renderTopic(topicButton.dataset.helpTopic);
      return;
    }
    if (event.target.matches("[data-help-close]")) dialog.close();
  });

  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  function openHelp(key) {
    renderTopic(key);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function renderTopic(key) {
    const topic = SHEET_HELP_TOPICS[key] || SHEET_HELP_TOPICS.save;
    dialog.dataset.helpCurrent = key;
    dialog.querySelectorAll("[data-help-topic]").forEach(button => {
      const active = button.dataset.helpTopic === key;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    const title = dialog.querySelector("#sheet-help-title");
    const body = dialog.querySelector(".sheet-help-dialog__content");
    title.innerHTML = `${escapeHtml(topic.title)} <small>${escapeHtml(topic.en)}</small>`;
    body.innerHTML = `<p class="sheet-help-dialog__intro">${escapeHtml(topic.intro)}</p>${topic.sections.map(section => `
      <section class="sheet-help-block">
        <h3>${escapeHtml(section.heading)}</h3>
        ${section.body.map(text => `<p>${escapeHtml(text)}</p>`).join("")}
      </section>`).join("")}`;
    body.scrollTop = 0;
  }
}

function ensureHelpStyles() {
  if (document.querySelector('link[data-sheet-help-style]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./css-next/components/help.css?v=2";
  link.dataset.sheetHelpStyle = "1";
  document.head.append(link);
}

function createDialog() {
  const dialog = document.createElement("dialog");
  dialog.id = "sheet-help-dialog";
  dialog.className = "sheet-help-dialog";
  dialog.setAttribute("aria-labelledby", "sheet-help-title");
  dialog.innerHTML = `
    <div class="sheet-help-dialog__shell">
      <header class="sheet-help-dialog__header">
        <div><span>WEB APP GUIDE</span><strong id="sheet-help-title">ヘルプ</strong></div>
        <button type="button" class="sheet-help-dialog__close" data-help-close aria-label="ヘルプを閉じる">×</button>
      </header>
      <div class="sheet-help-dialog__layout">
        <nav class="sheet-help-dialog__nav" aria-label="ヘルプ項目">
          ${SHEET_HELP_ORDER.map(key => {
            const item = SHEET_HELP_TOPICS[key];
            return `<button type="button" data-help-topic="${key}"><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.en)}</small></button>`;
          }).join("")}
        </nav>
        <article class="sheet-help-dialog__content"></article>
      </div>
    </div>`;
  return dialog;
}

function installSidebarHelp() {
  const visibility = document.querySelector("#visibility")?.closest("label");
  const save = document.querySelector("#save-button");
  if (!visibility || !save || document.querySelector('[data-help-placement="sidebar"]')) return;
  const wrap = document.createElement("div");
  wrap.className = "sheet-sidebar-help-row";
  wrap.dataset.helpPlacement = "sidebar";
  wrap.append(
    helpButton("save", "保存と閲覧のHELP"),
    helpButton("viewing", "閲覧画面のHELP")
  );
  visibility.before(wrap);
}

function installImageHelp() {
  const header = document.querySelector(".sheet-image-editor__header");
  if (!header || header.querySelector('[data-sheet-help="image"]')) return;
  header.append(helpButton("image", "キャスト画像のHELP"));
}

function installComboHelp() {
  const toolbar = document.querySelector("#sheet-combo-entry .toolbar");
  if (!toolbar || toolbar.querySelector('[data-sheet-help="combos"]')) return;
  toolbar.append(helpButton("combos", "コンボ／技能カウンターのHELP"));
  toolbar.classList.add("toolbar--with-help");
}

function installSectionHelp(sectionId, key) {
  const section = document.getElementById(sectionId);
  const toolbar = section?.querySelector(".toolbar");
  if (!toolbar || toolbar.querySelector(`[data-sheet-help="${key}"]`)) return;
  toolbar.append(helpButton(key, `${SHEET_HELP_TOPICS[key].title}のHELP`));
  toolbar.classList.add("toolbar--with-help");
}

function helpButton(key, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sheet-help-trigger";
  button.dataset.sheetHelp = key;
  button.setAttribute("aria-label", label);
  button.innerHTML = '<span>HELP</span><small>GUIDE</small>';
  return button;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
